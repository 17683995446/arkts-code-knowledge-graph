import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { TaskScheduler } from '../../src/core/scheduler/TaskScheduler'
import { ProgressTracker } from '../../src/core/progress/ProgressTracker'

describe('TaskScheduler', () => {
  let scheduler: TaskScheduler

  beforeEach(() => {
    scheduler = new TaskScheduler({
      minWorkers: 1,
      maxWorkers: 4,
      taskTimeout: 5000,
      maxRetries: 2,
      enablePriority: true,
    })
  })

  afterEach(() => {
    scheduler.stop()
  })

  it('should schedule and complete a simple task', async () => {
    const result = await scheduler.schedule(
      async () => {
        return 'success'
      },
      {
        name: 'SimpleTask',
        priority: 'normal',
      }
    )

    expect(result.success).toBe(true)
    expect(result.data).toBe('success')
  })

  it('should respect priority ordering', async () => {
    const executionOrder: string[] = []

    await Promise.all([
      scheduler.schedule(
        async () => {
          executionOrder.push('low')
          return 'low'
        },
        { name: 'LowTask', priority: 'low' }
      ),
      scheduler.schedule(
        async () => {
          executionOrder.push('high')
          return 'high'
        },
        { name: 'HighTask', priority: 'high' }
      ),
      scheduler.schedule(
        async () => {
          executionOrder.push('critical')
          return 'critical'
        },
        { name: 'CriticalTask', priority: 'critical' }
      ),
    ])

    expect(executionOrder.includes('critical')).toBe(true)
    expect(executionOrder.includes('high')).toBe(true)
    expect(executionOrder.includes('low')).toBe(true)
  })

  it('should retry failed tasks', async () => {
    let attempts = 0

    const result = await scheduler.schedule(
      async () => {
        attempts++
        if (attempts < 2) {
          throw new Error('Need retry')
        }
        return 'finally succeeded'
      },
      {
        name: 'RetryTask',
        maxRetries: 3,
        retryDelay: 10,
      }
    )

    expect(attempts).toBeGreaterThan(1)
  })

  it('should cancel pending tasks', async () => {
    const result = scheduler.schedule(
      async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
        return 'should not reach here'
      },
      { name: 'CancelTask' }
    )

    const queue = scheduler.getQueueLength()
    expect(queue).toBe(0)
  })

  it('should get correct statistics', async () => {
    await scheduler.schedule(
      async () => 'task1',
      { name: 'Task1', priority: 'high' }
    )

    await scheduler.schedule(
      async () => 'task2',
      { name: 'Task2', priority: 'normal' }
    )

    const stats = scheduler.getStatistics()
    expect(stats.completedTasks).toBeGreaterThan(0)
    expect(stats.totalTasks).toBeGreaterThan(0)
  })
})

describe('ProgressTracker', () => {
  let tracker: ProgressTracker

  beforeEach(() => {
    tracker = new ProgressTracker()
  })

  afterEach(() => {
    tracker.clear()
  })

  it('should start and complete a task', async () => {
    const taskId = 'test-task'
    
    tracker.start(taskId, 'Test Task', 100)
    
    let progress = tracker.getProgress(taskId)
    expect(progress?.status).toBe('running')
    expect(progress?.progress).toBe(0)
    
    tracker.update(taskId, 50)
    progress = tracker.getProgress(taskId)
    expect(progress?.progress).toBe(50)
    
    tracker.complete(taskId, 'Done')
    progress = tracker.getProgress(taskId)
    expect(progress?.status).toBe('completed')
    expect(progress?.progress).toBe(100)
  })

  it('should emit progress events', () => {
    let events: any[] = []
    
    tracker.on('progress', (event) => {
      events.push(event)
    })
    
    const taskId = 'event-task'
    tracker.start(taskId, 'Event Task', 100)
    
    expect(events.length).toBeGreaterThan(0)
  })

  it('should handle task failure', async () => {
    const taskId = 'fail-task'
    
    tracker.start(taskId, 'Fail Task', 100)
    tracker.fail(taskId, new Error('Something went wrong'))
    
    const progress = tracker.getProgress(taskId)
    expect(progress?.status).toBe('failed')
    expect(progress?.error?.message).toBe('Something went wrong')
  })

  it('should pause and resume tasks', () => {
    const taskId = 'pause-task'
    
    tracker.start(taskId, 'Pause Task', 100)
    tracker.update(taskId, 30)
    
    tracker.pause(taskId, 'Paused')
    let progress = tracker.getProgress(taskId)
    expect(progress?.status).toBe('paused')
    
    tracker.resume(taskId, 'Resumed')
    progress = tracker.getProgress(taskId)
    expect(progress?.status).toBe('running')
  })

  it('should track history', async () => {
    const taskId1 = 'history-1'
    const taskId2 = 'history-2'
    
    tracker.start(taskId1, 'History 1', 100)
    tracker.complete(taskId1)
    
    tracker.start(taskId2, 'History 2', 100)
    tracker.complete(taskId2)
    
    const history = tracker.getHistory()
    expect(history.length).toBeGreaterThan(0)
  })

  it('should calculate statistics', async () => {
    for (let i = 0; i < 5; i++) {
      const taskId = `stat-task-${i}`
      tracker.start(taskId, `Stat ${i}`, 100)
      tracker.update(taskId, 100)
      tracker.complete(taskId)
    }
    
    const stats = tracker.getStatistics()
    expect(stats.totalTasks).toBe(5)
    expect(stats.completedTasks).toBe(5)
  })
})
