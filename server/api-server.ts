import express from 'express'
import cors from 'cors'
import { TaskScheduler } from '../core/scheduler/TaskScheduler'
import { ProgressTracker } from '../core/progress/ProgressTracker'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

const scheduler = new TaskScheduler()
const tracker = new ProgressTracker()

interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  timestamp: Date
}

function createResponse<T>(success: boolean, data?: T, error?: string): ApiResponse<T> {
  return {
    success,
    data,
    error,
    timestamp: new Date(),
  }
}

app.get('/health', (req, res) => {
  res.json(createResponse(true, { 
    status: 'ok',
    version: '4.1.0',
    uptime: process.uptime()
  }))
})

app.get('/api/status', (req, res) => {
  res.json(createResponse(true, {
    scheduler: scheduler.getStatistics(),
    tracker: tracker.getStatistics(),
    activeTasks: tracker.getActiveProgress().length,
    queueLength: scheduler.getQueueLength(),
  }))
})

app.get('/api/tasks', (req, res) => {
  const status = req.query.status as string
  let tasks: any[] = []

  if (status === 'pending') {
    tasks = tracker.getAllProgress().filter(t => t.status === 'pending')
  } else if (status === 'active') {
    tasks = tracker.getActiveProgress()
  } else if (status === 'completed') {
    tasks = tracker.getHistory().filter(t => t.status === 'completed')
  } else {
    tasks = [
      ...tracker.getAllProgress(),
      ...tracker.getHistory(50)
    ]
  }

  res.json(createResponse(true, { 
    tasks,
    count: tasks.length
  }))
})

app.post('/api/tasks', async (req, res) => {
  try {
    const { name, type, priority, maxRetries, timeout } = req.body

    tracker.start(`task-${Date.now()}`, name, 100)
    
    const result = await scheduler.schedule(
      async (payload) => {
        const taskId = Object.keys(tracker.getActiveProgress())[0]
        
        for (let i = 0; i <= 100; i += 20) {
          tracker.update(taskId, i)
          await new Promise(r => setTimeout(r, 200))
        }
        
        tracker.complete(taskId, '任务完成')
        return { success: true, data: payload }
      },
      {
        name,
        priority: priority || 'normal',
        maxRetries: maxRetries || 3,
        timeout: timeout || 60000,
      }
    )

    res.json(createResponse(true, result))
  } catch (error: any) {
    res.status(500).json(createResponse(false, null, error.message))
  }
})

app.get('/api/tasks/:taskId', (req, res) => {
  const { taskId } = req.params
  const progress = tracker.getProgress(taskId)
  
  if (!progress) {
    const fromHistory = tracker.getHistory().find(t => t.taskId === taskId)
    if (fromHistory) {
      return res.json(createResponse(true, fromHistory))
    }
    return res.status(404).json(createResponse(false, null, 'Task not found'))
  }

  res.json(createResponse(true, progress))
})

app.delete('/api/tasks/:taskId', (req, res) => {
  const { taskId } = req.params
  const cancelled = scheduler.cancelTask(taskId)
  
  if (cancelled) {
    tracker.cancel(taskId, '任务已取消')
  }

  res.json(createResponse(true, { cancelled }))
})

app.get('/api/progress', (req, res) => {
  const active = tracker.getActiveProgress()
  const stats = tracker.getStatistics()
  
  res.json(createResponse(true, {
    active,
    statistics: stats,
    overallProgress: tracker.getProgressPercentage()
  }))
})

app.get('/api/progress/:taskId', (req, res) => {
  const { taskId } = req.params
  const progress = tracker.getProgress(taskId)
  
  if (!progress) {
    return res.status(404).json(createResponse(false, null, 'Progress not found'))
  }

  res.json(createResponse(true, progress))
})

app.get('/api/scheduler/stats', (req, res) => {
  res.json(createResponse(true, scheduler.getStatistics()))
})

app.post('/api/scheduler/start', (req, res) => {
  scheduler.start()
  res.json(createResponse(true, { message: 'Scheduler started' }))
})

app.post('/api/scheduler/stop', (req, res) => {
  scheduler.stop()
  res.json(createResponse(true, { message: 'Scheduler stopped' }))
})

app.post('/api/scheduler/clear', (req, res) => {
  const type = req.query.type as string
  
  if (type === 'completed') {
    scheduler.clearCompleted()
    tracker.clearHistory()
  } else if (type === 'failed') {
    scheduler.clearFailed()
  } else {
    scheduler.clearCompleted()
    scheduler.clearFailed()
    tracker.clearHistory()
  }

  res.json(createResponse(true, { message: 'Cleared successfully' }))
})

app.get('/api/statistics', (req, res) => {
  const schedulerStats = scheduler.getStatistics()
  const trackerStats = tracker.getStatistics()
  
  res.json(createResponse(true, {
    scheduler: schedulerStats,
    tracker: trackerStats,
    combined: {
      totalTasks: trackerStats.totalTasks,
      successRate: schedulerStats.successRate,
      averageDuration: trackerStats.averageDuration,
      pendingTasks: schedulerStats.pendingTasks,
      runningTasks: tracker.getActiveProgress().length,
    }
  }))
})

app.get('/api/health/detailed', (req, res) => {
  res.json(createResponse(true, {
    node: {
      version: process.version,
      memory: process.memoryUsage(),
      uptime: process.uptime(),
      cwd: process.cwd(),
    },
    scheduler: {
      isRunning: true,
      queueLength: scheduler.getQueueLength(),
      runningCount: scheduler.getRunningCount(),
      workers: 4,
    },
    api: {
      version: '4.1.0',
      endpoints: [
        'GET /health',
        'GET /api/status',
        'GET /api/tasks',
        'POST /api/tasks',
        'GET /api/tasks/:id',
        'DELETE /api/tasks/:id',
        'GET /api/progress',
        'GET /api/progress/:id',
        'GET /api/statistics',
        'POST /api/scheduler/start',
        'POST /api/scheduler/stop',
        'POST /api/scheduler/clear',
      ],
    },
  }))
})

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('API Error:', err)
  res.status(500).json(createResponse(false, null, err.message || 'Internal server error'))
})

app.use((req, res) => {
  res.status(404).json(createResponse(false, null, 'Endpoint not found'))
})

export function startServer(port: number = PORT): Promise<express.Express> {
  return new Promise((resolve) => {
    const server = app.listen(port, () => {
      console.log(`API Server running at http://localhost:${port}`)
      console.log(`Health check: http://localhost:${port}/health`)
      console.log(`API Status: http://localhost:${port}/api/status`)
      resolve(app)
    })
  })
}

export default app
