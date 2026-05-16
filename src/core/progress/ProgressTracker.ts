import { EventEmitter } from 'events'

export type ProgressStatus = 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled'

export interface Progress {
  taskId: string
  name: string
  status: ProgressStatus
  progress: number
  total: number
  current: number
  startTime: Date
  endTime?: Date
  estimatedEndTime?: Date
  elapsedTime: number
  remainingTime: number
  error?: Error
  metadata?: Record<string, any>
}

export interface ProgressEvent {
  taskId: string
  progress: number
  status: ProgressStatus
  message?: string
  timestamp: Date
}

export interface Statistics {
  totalTasks: number
  completedTasks: number
  failedTasks: number
  averageProgress: number
  totalDuration: number
  averageDuration: number
}

export class ProgressTracker extends EventEmitter {
  private progressMap: Map<string, Progress> = new Map()
  private history: Progress[] = []
  private maxHistorySize: number = 1000

  constructor(maxHistorySize: number = 1000) {
    super()
    this.maxHistorySize = maxHistorySize
  }

  start(taskId: string, name: string, total: number = 100, metadata?: Record<string, any>): void {
    const progress: Progress = {
      taskId,
      name,
      status: 'running',
      progress: 0,
      total,
      current: 0,
      startTime: new Date(),
      elapsedTime: 0,
      remainingTime: 0,
      metadata,
    }

    this.progressMap.set(taskId, progress)
    this.emit('progress:started', this.createEvent(progress, 'Task started'))

    this.emit('progress', this.createEvent(progress))
  }

  update(taskId: string, current: number, message?: string): void {
    const progress = this.progressMap.get(taskId)
    if (!progress || progress.status !== 'running') return

    progress.current = current
    progress.progress = progress.total > 0 ? (current / progress.total) * 100 : 0
    progress.elapsedTime = Date.now() - progress.startTime.getTime()

    if (progress.progress > 0) {
      const estimatedTotal = progress.elapsedTime / (progress.progress / 100)
      progress.remainingTime = estimatedTotal - progress.elapsedTime
      progress.estimatedEndTime = new Date(Date.now() + progress.remainingTime)
    }

    this.emit('progress:updated', this.createEvent(progress, message))
    this.emit('progress', this.createEvent(progress, message))
  }

  complete(taskId: string, message?: string): void {
    const progress = this.progressMap.get(taskId)
    if (!progress) return

    progress.status = 'completed'
    progress.current = progress.total
    progress.progress = 100
    progress.endTime = new Date()
    progress.elapsedTime = progress.endTime.getTime() - progress.startTime.getTime()

    this.addToHistory(progress)
    this.emit('progress:completed', this.createEvent(progress, message || 'Task completed'))
    this.emit('progress', this.createEvent(progress, message))
  }

  fail(taskId: string, error: Error, message?: string): void {
    const progress = this.progressMap.get(taskId)
    if (!progress) return

    progress.status = 'failed'
    progress.error = error
    progress.endTime = new Date()
    progress.elapsedTime = progress.endTime.getTime() - progress.startTime.getTime()

    this.addToHistory(progress)
    this.emit('progress:failed', this.createEvent(progress, message || `Task failed: ${error.message}`))
    this.emit('progress', this.createEvent(progress, message))
  }

  pause(taskId: string, message?: string): void {
    const progress = this.progressMap.get(taskId)
    if (!progress || progress.status !== 'running') return

    progress.status = 'paused'
    progress.elapsedTime = Date.now() - progress.startTime.getTime()

    this.emit('progress:paused', this.createEvent(progress, message || 'Task paused'))
    this.emit('progress', this.createEvent(progress, message))
  }

  resume(taskId: string, message?: string): void {
    const progress = this.progressMap.get(taskId)
    if (!progress || progress.status !== 'paused') return

    const pausedTime = Date.now() - progress.startTime.getTime() - progress.elapsedTime
    progress.status = 'running'
    progress.startTime = new Date(Date.now() - progress.elapsedTime)

    this.emit('progress:resumed', this.createEvent(progress, message || 'Task resumed'))
    this.emit('progress', this.createEvent(progress, message))
  }

  cancel(taskId: string, message?: string): void {
    const progress = this.progressMap.get(taskId)
    if (!progress) return

    progress.status = 'cancelled'
    progress.endTime = new Date()
    progress.elapsedTime = progress.endTime.getTime() - progress.startTime.getTime()

    this.addToHistory(progress)
    this.emit('progress:cancelled', this.createEvent(progress, message || 'Task cancelled'))
    this.emit('progress', this.createEvent(progress, message))
  }

  getProgress(taskId: string): Progress | null {
    return this.progressMap.get(taskId) || null
  }

  getAllProgress(): Progress[] {
    return Array.from(this.progressMap.values())
  }

  getActiveProgress(): Progress[] {
    return this.getAllProgress().filter((p) => p.status === 'running' || p.status === 'paused')
  }

  getHistory(limit?: number): Progress[] {
    if (limit) {
      return this.history.slice(-limit)
    }
    return [...this.history]
  }

  getStatistics(): Statistics {
    const completedTasks = this.history.filter((p) => p.status === 'completed')
    const failedTasks = this.history.filter((p) => p.status === 'failed')

    const totalDuration = this.history.reduce((sum, p) => sum + (p.elapsedTime || 0), 0)
    const averageDuration = this.history.length > 0 ? totalDuration / this.history.length : 0

    const totalProgress = this.history.reduce((sum, p) => sum + (p.progress || 0), 0)
    const averageProgress = this.history.length > 0 ? totalProgress / this.history.length : 0

    return {
      totalTasks: this.history.length,
      completedTasks: completedTasks.length,
      failedTasks: failedTasks.length,
      averageProgress,
      totalDuration,
      averageDuration,
    }
  }

  remove(taskId: string): boolean {
    const deleted = this.progressMap.delete(taskId)
    if (deleted) {
      this.emit('progress:removed', { taskId, timestamp: new Date() })
    }
    return deleted
  }

  clear(): void {
    this.progressMap.clear()
    this.history = []
    this.emit('progress:cleared', { timestamp: new Date() })
  }

  clearHistory(): void {
    this.history = []
    this.emit('history:cleared', { timestamp: new Date() })
  }

  private addToHistory(progress: Progress): void {
    this.history.push({ ...progress })
    
    if (this.history.length > this.maxHistorySize) {
      this.history = this.history.slice(-this.maxHistorySize)
    }
  }

  private createEvent(progress: Progress, message?: string): ProgressEvent {
    return {
      taskId: progress.taskId,
      progress: progress.progress,
      status: progress.status,
      message,
      timestamp: new Date(),
    }
  }

  async waitForCompletion(taskId: string, intervalMs: number = 100): Promise<Progress> {
    return new Promise((resolve) => {
      const checkProgress = () => {
        const progress = this.getProgress(taskId)
        
        if (!progress) {
          resolve(progress as any)
          return
        }

        if (progress.status === 'completed' || progress.status === 'failed' || progress.status === 'cancelled') {
          resolve(progress)
          return
        }

        setTimeout(checkProgress, intervalMs)
      }

      setImmediate(checkProgress)
    })
  }

  getProgressPercentage(): number {
    const active = this.getActiveProgress()
    if (active.length === 0) return 0

    const totalProgress = active.reduce((sum, p) => sum + p.progress, 0)
    return totalProgress / active.length
  }

  formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    }
    return `${seconds}s`
  }

  formatEstimatedTime(ms: number): string {
    if (ms <= 0) return '即将完成'
    return this.formatDuration(ms)
  }
}

export default ProgressTracker
