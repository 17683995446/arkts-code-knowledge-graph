import { EventEmitter } from 'events'

export type TaskPriority = 'low' | 'normal' | 'high' | 'critical'

export interface Task<T = any, R = any> {
  id: string
  name: string
  type: string
  priority: TaskPriority
  payload: T
  dependencies?: string[]
  retries: number
  maxRetries: number
  timeout?: number
  createdAt: Date
  startedAt?: Date
  completedAt?: Date
  failedAt?: Date
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  result?: R
  error?: Error
  progress?: number
  taskFn?: (payload: T) => Promise<R>
}

export interface TaskResult<T = any> {
  success: boolean
  data?: T
  error?: Error
  duration: number
  retries: number
}

export interface TaskOptions {
  name?: string
  priority?: TaskPriority
  dependencies?: string[]
  maxRetries?: number
  timeout?: number
  onProgress?: (progress: number) => void
  onComplete?: (result: TaskResult) => void
  onError?: (error: Error) => void
}

export interface SchedulerConfig {
  minWorkers: number
  maxWorkers: number
  taskTimeout: number
  maxRetries: number
  retryDelay: number
  queueSize: number
  enablePriority: boolean
  enableDAG: boolean
}

export class TaskScheduler extends EventEmitter {
  private config: Required<SchedulerConfig>
  private tasks: Map<string, Task> = new Map()
  private taskQueue: Task[] = []
  private runningTasks: Map<string, Task> = new Map()
  private completedTasks: Map<string, Task> = new Map()
  private failedTasks: Map<string, Task> = new Map()
  private isRunning: boolean = false
  private processingInterval: NodeJS.Timeout | null = null
  private statistics = {
    totalTasks: 0,
    completedTasks: 0,
    failedTasks: 0,
    totalDuration: 0,
    averageDuration: 0,
  }

  private static readonly DEFAULT_CONFIG: SchedulerConfig = {
    minWorkers: 2,
    maxWorkers: 10,
    taskTimeout: 60000,
    maxRetries: 3,
    retryDelay: 1000,
    queueSize: 1000,
    enablePriority: true,
    enableDAG: true,
  }

  constructor(config: Partial<SchedulerConfig> = {}) {
    super()
    this.config = {
      ...TaskScheduler.DEFAULT_CONFIG,
      ...config,
    } as Required<SchedulerConfig>
  }

  async schedule<T = any, R = any>(
    taskFn: (payload: T) => Promise<R>,
    options: TaskOptions = {}
  ): Promise<TaskResult<R>> {
    const taskId = this.generateTaskId()
    const task: Task<T, R> = {
      id: taskId,
      name: options.name || `Task-${taskId}`,
      type: 'generic',
      priority: options.priority || 'normal',
      payload: {} as T,
      dependencies: options.dependencies || [],
      retries: 0,
      maxRetries: options.maxRetries || this.config.maxRetries,
      timeout: options.timeout || this.config.taskTimeout,
      createdAt: new Date(),
      status: 'pending',
      taskFn,
    }

    this.tasks.set(taskId, task as any)
    this.statistics.totalTasks++

    if (this.config.enablePriority) {
      this.enqueueWithPriority(task as any)
    } else {
      this.taskQueue.push(task as any)
    }

    this.emit('task:scheduled', task)

    if (!this.isRunning) {
      this.start()
    }

    return new Promise((resolve) => {
      const checkComplete = () => {
        const currentTask = this.tasks.get(taskId) as any
        if (currentTask.status === 'completed') {
          resolve({
            success: true,
            data: currentTask.result,
            duration: (currentTask.completedAt?.getTime() || 0) - (currentTask.startedAt?.getTime() || 0),
            retries: currentTask.retries,
          })
        } else if (currentTask.status === 'failed') {
          resolve({
            success: false,
            error: currentTask.error,
            duration: (currentTask.failedAt?.getTime() || 0) - (currentTask.startedAt?.getTime() || 0),
            retries: currentTask.retries,
          })
        } else {
          setImmediate(checkComplete)
        }
      }
      setImmediate(checkComplete)
    })
  }

  private enqueueWithPriority(task: Task): void {
    const priorityIndex = this.getPriorityIndex(task.priority)
    
    let inserted = false
    for (let i = 0; i < this.taskQueue.length; i++) {
      if (this.getPriorityIndex(this.taskQueue[i].priority) > priorityIndex) {
        this.taskQueue.splice(i, 0, task)
        inserted = true
        break
      }
    }

    if (!inserted) {
      this.taskQueue.push(task)
    }
  }

  private getPriorityIndex(priority: TaskPriority): number {
    const priorities: Record<TaskPriority, number> = {
      critical: 0,
      high: 1,
      normal: 2,
      low: 3,
    }
    return priorities[priority]
  }

  private generateTaskId(): string {
    return `task-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
  }

  start(): void {
    if (this.isRunning) return
    
    this.isRunning = true
    this.emit('scheduler:started')

    // 直接处理队列中的任务
    this.processAllTasks()
  }

  stop(): void {
    this.isRunning = false
    if (this.processingInterval) {
      clearInterval(this.processingInterval)
      this.processingInterval = null
    }
    this.emit('scheduler:stopped')
  }

  private async processAllTasks(): Promise<void> {
    while (this.isRunning && this.taskQueue.length > 0) {
      const availableSlots = this.config.maxWorkers - this.runningTasks.size
      if (availableSlots <= 0) {
        await new Promise(resolve => setTimeout(resolve, 10))
        continue
      }

      const task = this.taskQueue.shift()
      if (task) {
        this.executeTask(task) // 不 await，让它并行执行
      }
    }
  }

  private async executeTask(task: Task): Promise<void> {
    if (task.dependencies && task.dependencies.length > 0) {
      const depsCompleted = task.dependencies.every((depId) => {
        const dep = this.tasks.get(depId)
        return dep?.status === 'completed'
      })

      if (!depsCompleted) {
        this.taskQueue.unshift(task)
        return
      }
    }

    task.status = 'running'
    task.startedAt = new Date()
    this.runningTasks.set(task.id, task)
    
    this.emit('task:started', task)

    try {
      const result = await this.executeWithTimeout(task)
      
      task.status = 'completed'
      task.completedAt = new Date()
      task.result = result
      
      this.runningTasks.delete(task.id)
      this.completedTasks.set(task.id, task)
      this.statistics.completedTasks++
      
      this.updateStatistics(task)
      this.emit('task:completed', task)
    } catch (error: any) {
      await this.handleTaskFailure(task, error)
    }
  }

  private async executeWithTimeout(task: Task): Promise<any> {
    return new Promise(async (resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Task ${task.id} timed out after ${task.timeout}ms`))
      }, task.timeout || 30000)

      try {
        if (task.taskFn) {
          const result = await task.taskFn(task.payload)
          clearTimeout(timeoutId)
          resolve(result)
        } else {
          clearTimeout(timeoutId)
          resolve(task.payload)
        }
      } catch (error) {
        clearTimeout(timeoutId)
        reject(error)
      }
    })
  }

  private async handleTaskFailure(task: Task, error: Error): Promise<void> {
    task.retries++

    if (task.retries < task.maxRetries) {
      this.emit('task:retry', { task, attempt: task.retries })
      
      setTimeout(() => {
        this.taskQueue.unshift(task)
        if (!this.isRunning) {
          this.start()
        }
      }, this.config.retryDelay * Math.pow(2, task.retries - 1))
    } else {
      task.status = 'failed'
      task.failedAt = new Date()
      task.error = error
      
      this.runningTasks.delete(task.id)
      this.failedTasks.set(task.id, task)
      this.statistics.failedTasks++
      
      this.emit('task:failed', { task, error })
    }
  }

  private updateStatistics(task: Task): void {
    if (task.completedAt && task.startedAt) {
      const duration = task.completedAt.getTime() - task.startedAt.getTime()
      this.statistics.totalDuration += duration
      this.statistics.averageDuration = this.statistics.totalDuration / this.statistics.completedTasks
    }
  }

  getTask(taskId: string): Task | undefined {
    return this.tasks.get(taskId)
  }

  getQueueLength(): number {
    return this.taskQueue.length
  }

  getRunningCount(): number {
    return this.runningTasks.size
  }

  getStatistics(): typeof this.statistics & {
    pendingTasks: number
    queueLength: number
    successRate: number
    failureRate: number
  } {
    return {
      ...this.statistics,
      pendingTasks: this.tasks.size - this.runningTasks.size - this.completedTasks.size - this.failedTasks.size,
      queueLength: this.taskQueue.length,
      successRate: this.statistics.totalTasks > 0 
        ? (this.statistics.completedTasks / this.statistics.totalTasks) * 100 
        : 0,
      failureRate: this.statistics.totalTasks > 0 
        ? (this.statistics.failedTasks / this.statistics.totalTasks) * 100 
        : 0,
    }
  }

  cancelTask(taskId: string): boolean {
    const task = this.tasks.get(taskId)
    if (!task) return false

    if (task.status === 'pending') {
      task.status = 'cancelled'
      const queueIndex = this.taskQueue.findIndex((t) => t.id === taskId)
      if (queueIndex > -1) {
        this.taskQueue.splice(queueIndex, 1)
      }
      this.emit('task:cancelled', task)
      return true
    }

    return false
  }

  clearCompleted(): void {
    this.completedTasks.clear()
  }

  clearFailed(): void {
    this.failedTasks.clear()
  }

  async waitForCompletion(): Promise<void> {
    while (this.taskQueue.length > 0 || this.runningTasks.size > 0) {
      await new Promise((resolve) => setTimeout(resolve, 10))
    }
  }
}

export default TaskScheduler
