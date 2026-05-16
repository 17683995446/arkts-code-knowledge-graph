import * as fs from 'fs'
import * as path from 'path'
import * as z from 'zod'

export const ConfigSchema = z.object({
  server: z.object({
    port: z.number().int().min(1).max(65535).default(3001),
    host: z.string().default('localhost'),
  }),
  
  database: z.object({
    type: z.enum(['sqlite', 'postgres', 'mysql']).default('sqlite'),
    connection: z.string().default(':memory:'),
    poolSize: z.number().int().positive().default(10),
  }),

  scheduler: z.object({
    minWorkers: z.number().int().positive().default(2),
    maxWorkers: z.number().int().positive().default(10),
    taskTimeout: z.number().int().positive().default(60000),
    maxRetries: z.number().int().nonnegative().default(3),
    retryDelay: z.number().int().nonnegative().default(1000),
    queueSize: z.number().int().positive().default(1000),
    enablePriority: z.boolean().default(true),
    enableDAG: z.boolean().default(true),
  }),

  progress: z.object({
    maxHistorySize: z.number().int().positive().default(1000),
    enableHistory: z.boolean().default(true),
  }),

  api: z.object({
    corsOrigins: z.array(z.string()).default(['*']),
    rateLimitWindow: z.number().int().positive().default(60000),
    rateLimitMax: z.number().int().positive().default(100),
  }),

  logging: z.object({
    level: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
    format: z.enum(['json', 'text']).default('text'),
    enableFile: z.boolean().default(true),
    logDir: z.string().default('./logs'),
  }),

  monitoring: z.object({
    enableAPM: z.boolean().default(false),
    metricsInterval: z.number().int().positive().default(60000),
    enableAlerting: z.boolean().default(false),
  }),
})

export type Config = z.infer<typeof ConfigSchema>

export class ConfigManager {
  private config: Config | null = null
  private configPath: string
  private envPrefix: string = 'ARKTS_'
  private watcher: fs.FSWatcher | null = null
  private subscribers: Set<(config: Config) => void> = new Set()

  constructor(configPath?: string) {
    this.configPath = configPath || this.getDefaultConfigPath()
  }

  private getDefaultConfigPath(): string {
    const possiblePaths = [
      './.arktsrc',
      './.arktsrc.json',
      './arkts.config.json',
      './config/arkts.config.json',
    ]

    for (const p of possiblePaths) {
      const fullPath = path.resolve(process.cwd(), p)
      if (fs.existsSync(fullPath)) {
        return fullPath
      }
    }

    return path.resolve(process.cwd(), './arkts.config.json')
  }

  async load(): Promise<Config> {
    let fileConfig: Partial<Config> = {}
    
    if (fs.existsSync(this.configPath)) {
      const content = await fs.promises.readFile(this.configPath, 'utf-8')
      fileConfig = JSON.parse(content)
    }

    const envConfig = this.loadFromEnv()
    const mergedConfig = this.mergeConfigs(fileConfig, envConfig)
    
    try {
      this.config = ConfigSchema.parse(mergedConfig)
      this.ensureDirectories(this.config)
      return this.config
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('Config validation errors:', error.errors)
      }
      throw new Error('Invalid configuration')
    }
  }

  private loadFromEnv(): Partial<Config> {
    const envConfig: any = {}

    for (const [key, value] of Object.entries(process.env)) {
      if (key.startsWith(this.envPrefix)) {
        const nestedKey = key.slice(this.envPrefix.length)
        const parts = nestedKey.split('__')
        
        let current = envConfig
        for (let i = 0; i < parts.length - 1; i++) {
          const part = parts[i].toLowerCase()
          if (!current[part]) {
            current[part] = {}
          }
          current = current[part]
        }
        
        const lastPart = parts[parts.length - 1].toLowerCase()
        const numValue = Number(value)
        
        if (!isNaN(numValue)) {
          current[lastPart] = numValue
        } else if (value === 'true' || value === 'false') {
          current[lastPart] = value === 'true'
        } else if (value.startsWith('[') && value.endsWith(']')) {
          current[lastPart] = JSON.parse(value)
        } else {
          current[lastPart] = value
        }
      }
    }

    return envConfig
  }

  private mergeConfigs(base: Partial<Config>, override: Partial<Config>): Partial<Config> {
    const result = { ...base }
    
    for (const [key, value] of Object.entries(override)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        result[key as keyof Config] = this.mergeConfigs(
          (base[key as keyof Config] || {}) as any,
          value as any
        )
      } else {
        result[key as keyof Config] = value as any
      }
    }

    return result
  }

  private ensureDirectories(config: Config): void {
    if (config.logging.enableFile) {
      const logDir = path.resolve(config.logging.logDir)
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true })
      }
    }
  }

  get<T extends keyof Config>(key?: T): T extends keyof Config ? Config[T] : Config {
    if (!this.config) {
      throw new Error('Config not loaded')
    }
    
    return key ? this.config[key] : this.config as any
  }

  async update(updates: Partial<Config>): Promise<Config> {
    if (!this.config) {
      throw new Error('Config not loaded')
    }

    const newConfig = ConfigSchema.parse(
      this.mergeConfigs(this.config, updates)
    )

    const configDir = path.dirname(this.configPath)
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true })
    }

    await fs.promises.writeFile(
      this.configPath,
      JSON.stringify(newConfig, null, 2)
    )

    this.config = newConfig
    this.notifySubscribers(newConfig)
    return newConfig
  }

  watch(): void {
    if (this.watcher) return
    
    this.watcher = fs.watch(
      path.dirname(this.configPath),
      (eventType, filename) => {
        if (filename && path.basename(this.configPath) === filename) {
          if (eventType === 'change') {
            this.load()
              .then(config => this.notifySubscribers(config))
              .catch(err => console.error('Failed to reload config:', err))
          }
        }
      }
    )
  }

  unwatch(): void {
    if (this.watcher) {
      this.watcher.close()
      this.watcher = null
    }
  }

  subscribe(callback: (config: Config) => void): () => void {
    this.subscribers.add(callback)
    return () => {
      this.subscribers.delete(callback)
    }
  }

  private notifySubscribers(config: Config): void {
    for (const callback of this.subscribers) {
      try {
        callback(config)
      } catch (error) {
        console.error('Config subscriber error:', error)
      }
    }
  }

  validate(config: any): config is Config {
    const result = ConfigSchema.safeParse(config)
    return result.success
  }
}

export default ConfigManager
