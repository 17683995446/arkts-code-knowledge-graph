import { EventEmitter } from 'events'
import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'

export interface FileChange {
  type: 'added' | 'modified' | 'deleted'
  path: string
  relativePath: string
  timestamp: Date
  hash?: string
  previousHash?: string
}

export interface WatcherOptions {
  extensions: string[]
  ignorePatterns: string[]
  rootPath: string
  enableHashing: boolean
  debounceMs: number
}

export class FileWatcher extends EventEmitter {
  private watcher: fs.FSWatcher | null = null
  private fileHashes: Map<string, string> = new Map()
  private options: Required<WatcherOptions>
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map()
  private isWatching: boolean = false

  constructor(options: WatcherOptions) {
    super()
    this.options = {
      extensions: options.extensions || ['.ts', '.tsx', '.js', '.jsx'],
      ignorePatterns: options.ignorePatterns || ['node_modules', 'dist', '.git'],
      rootPath: options.rootPath,
      enableHashing: options.enableHashing !== false,
      debounceMs: options.debounceMs || 300,
    }
  }

  async start(): Promise<void> {
    if (this.isWatching) {
      console.warn('FileWatcher is already running')
      return
    }

    try {
      await this.initializeHashes()
      
      this.watcher = fs.watch(
        this.options.rootPath,
        { recursive: true },
        (eventType, filename) => {
          if (filename) {
            this.handleFileChange(eventType, filename)
          }
        }
      )

      this.watcher.on('error', (error) => {
        console.error('Watcher error:', error)
        this.emit('error', error)
      })

      this.isWatching = true
      console.log(`FileWatcher started on: ${this.options.rootPath}`)
      this.emit('started')
    } catch (error) {
      console.error('Failed to start FileWatcher:', error)
      throw error
    }
  }

  stop(): void {
    if (this.watcher) {
      this.watcher.close()
      this.watcher = null
    }
    
    this.debounceTimers.forEach(timer => clearTimeout(timer))
    this.debounceTimers.clear()
    
    this.isWatching = false
    console.log('FileWatcher stopped')
    this.emit('stopped')
  }

  private async initializeHashes(): Promise<void> {
    const files = await this.scanDirectory(this.options.rootPath)
    
    for (const file of files) {
      if (this.options.enableHashing) {
        const hash = await this.calculateFileHash(file)
        this.fileHashes.set(file, hash)
      } else {
        this.fileHashes.set(file, '')
      }
    }
    
    console.log(`Initialized ${this.fileHashes.size} file hashes`)
  }

  private async scanDirectory(dirPath: string): Promise<string[]> {
    const files: string[] = []
    
    const scan = async (currentPath: string): Promise<void> => {
      try {
        const entries = await fs.promises.readdir(currentPath, { withFileTypes: true })
        
        for (const entry of entries) {
          const fullPath = path.join(currentPath, entry.name)
          
          if (entry.isDirectory()) {
            if (!this.shouldIgnore(entry.name)) {
              await scan(fullPath)
            }
          } else if (entry.isFile() && this.shouldWatch(fullPath)) {
            files.push(fullPath)
          }
        }
      } catch (error) {
        console.error(`Error scanning directory ${currentPath}:`, error)
      }
    }
    
    await scan(dirPath)
    return files
  }

  private shouldIgnore(name: string): boolean {
    return this.options.ignorePatterns.some(pattern => {
      if (pattern.startsWith('*.')) {
        return name.endsWith(pattern.slice(1))
      }
      return name === pattern || name.startsWith(pattern)
    })
  }

  private shouldWatch(filePath: string): boolean {
    const ext = path.extname(filePath)
    return this.options.extensions.includes(ext)
  }

  private handleFileChange(eventType: string, filename: string): void {
    const fullPath = path.resolve(this.options.rootPath, filename)
    
    if (!this.shouldWatch(fullPath)) {
      return
    }

    const relativePath = path.relative(this.options.rootPath, fullPath)
    const existingHash = this.fileHashes.get(fullPath)

    if (this.debounceTimers.has(fullPath)) {
      clearTimeout(this.debounceTimers.get(fullPath))
    }

    const timer = setTimeout(async () => {
      this.debounceTimers.delete(fullPath)
      
      try {
        const stats = await fs.promises.stat(fullPath)
        
        if (stats.isFile()) {
          const newHash = this.options.enableHashing 
            ? await this.calculateFileHash(fullPath)
            : ''

          if (existingHash === undefined) {
            const change: FileChange = {
              type: 'added',
              path: fullPath,
              relativePath,
              timestamp: new Date(),
              hash: newHash,
            }
            this.fileHashes.set(fullPath, newHash)
            this.emitFileChange(change)
          } else if (newHash !== existingHash) {
            const change: FileChange = {
              type: 'modified',
              path: fullPath,
              relativePath,
              timestamp: new Date(),
              hash: newHash,
              previousHash: existingHash,
            }
            this.fileHashes.set(fullPath, newHash)
            this.emitFileChange(change)
          }
        }
      } catch (error: any) {
        if (error.code === 'ENOENT') {
          if (existingHash !== undefined) {
            const change: FileChange = {
              type: 'deleted',
              path: fullPath,
              relativePath,
              timestamp: new Date(),
              previousHash: existingHash,
            }
            this.fileHashes.delete(fullPath)
            this.emitFileChange(change)
          }
        } else {
          console.error(`Error handling file change for ${fullPath}:`, error)
        }
      }
    }, this.options.debounceMs)

    this.debounceTimers.set(fullPath, timer)
  }

  private async calculateFileHash(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256')
      const stream = fs.createReadStream(filePath)
      
      stream.on('data', data => hash.update(data))
      stream.on('end', () => resolve(hash.digest('hex')))
      stream.on('error', reject)
    })
  }

  private emitFileChange(change: FileChange): void {
    console.log(`File ${change.type}: ${change.relativePath}`)
    this.emit('change', change)
    
    switch (change.type) {
      case 'added':
        this.emit('added', change)
        break
      case 'modified':
        this.emit('modified', change)
        break
      case 'deleted':
        this.emit('deleted', change)
        break
    }
  }

  getWatchedFiles(): string[] {
    return Array.from(this.fileHashes.keys())
  }

  getFileCount(): number {
    return this.fileHashes.size
  }

  getStatus(): {
    isWatching: boolean
    fileCount: number
    rootPath: string
  } {
    return {
      isWatching: this.isWatching,
      fileCount: this.fileHashes.size,
      rootPath: this.options.rootPath,
    }
  }
}

export default FileWatcher
