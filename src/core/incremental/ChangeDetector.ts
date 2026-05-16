import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'

export interface FileMetadata {
  path: string
  hash: string
  size: number
  lastModified: Date
  entities: string[]
  dependencies: string[]
}

export interface ChangeDetectionResult {
  added: string[]
  modified: string[]
  deleted: string[]
  unchanged: string[]
  affectedByChanges: string[]
}

export class ChangeDetector {
  private metadataCache: Map<string, FileMetadata> = new Map()
  private cacheFilePath: string

  constructor(cacheDir: string = '.arkts-cache') {
    this.cacheFilePath = path.join(cacheDir, 'file-metadata.json')
    this.loadCache()
  }

  async detectChanges(
    projectPath: string,
    extensions: string[] = ['.ts', '.tsx', '.js', '.jsx']
  ): Promise<ChangeDetectionResult> {
    const currentFiles = await this.scanFiles(projectPath, extensions)
    const previousMetadata = new Map(this.metadataCache)
    
    const result: ChangeDetectionResult = {
      added: [],
      modified: [],
      deleted: [],
      unchanged: [],
      affectedByChanges: [],
    }

    for (const file of currentFiles) {
      const previous = previousMetadata.get(file)
      const currentHash = await this.calculateHash(file)
      const stats = await fs.promises.stat(file)

      if (!previous) {
        result.added.push(file)
      } else if (previous.hash !== currentHash) {
        result.modified.push(file)
      } else {
        result.unchanged.push(file)
      }

      this.metadataCache.set(file, {
        path: file,
        hash: currentHash,
        size: stats.size,
        lastModified: stats.mtime,
        entities: previous?.entities || [],
        dependencies: previous?.dependencies || [],
      })
    }

    for (const [previousFile] of previousMetadata) {
      if (!currentFiles.includes(previousFile)) {
        result.deleted.push(previousFile)
        this.metadataCache.delete(previousFile)
      }
    }

    result.affectedByChanges = await this.findAffectedFiles(result.modified, result.deleted)

    await this.saveCache()

    return result
  }

  private async scanFiles(
    dirPath: string,
    extensions: string[]
  ): Promise<string[]> {
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
          } else if (entry.isFile()) {
            const ext = path.extname(entry.name)
            if (extensions.includes(ext)) {
              files.push(fullPath)
            }
          }
        }
      } catch (error) {
        console.error(`Error scanning ${currentPath}:`, error)
      }
    }

    await scan(dirPath)
    return files
  }

  private shouldIgnore(name: string): boolean {
    const ignorePatterns = [
      'node_modules',
      'dist',
      'build',
      '.git',
      '.svn',
      '__pycache__',
      '.next',
      '.nuxt',
    ]
    return ignorePatterns.includes(name)
  }

  private async calculateHash(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('md5')
      const stream = fs.createReadStream(filePath)

      stream.on('data', (data) => hash.update(data))
      stream.on('end', () => resolve(hash.digest('hex')))
      stream.on('error', reject)
    })
  }

  private async findAffectedFiles(
    modified: string[],
    deleted: string[]
  ): Promise<string[]> {
    const affected = new Set<string>()
    const changedFiles = new Set([...modified, ...deleted])

    for (const [file, metadata] of this.metadataCache) {
      const deps = metadata.dependencies || []
      
      for (const dep of deps) {
        if (changedFiles.has(dep)) {
          affected.add(file)
          break
        }
      }
    }

    return Array.from(affected)
  }

  setFileDependencies(filePath: string, dependencies: string[]): void {
    const metadata = this.metadataCache.get(filePath)
    if (metadata) {
      metadata.dependencies = dependencies
      this.metadataCache.set(filePath, metadata)
    }
  }

  setFileEntities(filePath: string, entities: string[]): void {
    const metadata = this.metadataCache.get(filePath)
    if (metadata) {
      metadata.entities = entities
      this.metadataCache.set(filePath, metadata)
    }
  }

  private loadCache(): void {
    try {
      if (fs.existsSync(this.cacheFilePath)) {
        const data = fs.readFileSync(this.cacheFilePath, 'utf-8')
        const cache = JSON.parse(data)

        for (const [key, value] of Object.entries(cache)) {
          const metadata = value as FileMetadata
          metadata.lastModified = new Date(metadata.lastModified)
          this.metadataCache.set(key, metadata)
        }

        console.log(`Loaded ${this.metadataCache.size} cached file metadata`)
      }
    } catch (error) {
      console.warn('Failed to load metadata cache:', error)
    }
  }

  async saveCache(): Promise<void> {
    try {
      const cacheDir = path.dirname(this.cacheFilePath)
      if (!fs.existsSync(cacheDir)) {
        await fs.promises.mkdir(cacheDir, { recursive: true })
      }

      const cache: Record<string, FileMetadata> = {}
      for (const [key, value] of this.metadataCache) {
        cache[key] = value
      }

      await fs.promises.writeFile(
        this.cacheFilePath,
        JSON.stringify(cache, null, 2),
        'utf-8'
      )

      console.log(`Saved ${this.metadataCache.size} file metadata to cache`)
    } catch (error) {
      console.error('Failed to save metadata cache:', error)
    }
  }

  clearCache(): void {
    this.metadataCache.clear()
    try {
      if (fs.existsSync(this.cacheFilePath)) {
        fs.unlinkSync(this.cacheFilePath)
      }
    } catch (error) {
      console.error('Failed to delete cache file:', error)
    }
  }

  getStatistics(): {
    totalFiles: number
    totalSize: number
    averageFileSize: number
  } {
    let totalSize = 0

    for (const metadata of this.metadataCache.values()) {
      totalSize += metadata.size
    }

    return {
      totalFiles: this.metadataCache.size,
      totalSize,
      averageFileSize:
        this.metadataCache.size > 0 ? totalSize / this.metadataCache.size : 0,
    }
  }
}

export default ChangeDetector
