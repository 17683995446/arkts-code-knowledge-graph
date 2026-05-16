import * as crypto from 'crypto';
import * as path from 'path';
import * as fs from 'fs';
import { minimatch } from 'minimatch';

export function generateUniqueIdentifier(): string {
  return crypto.randomUUID();
}

export function hashStringContent(content: string): string {
  return crypto
    .createHash('sha256')
    .update(content)
    .digest('hex');
}

export function fileMatchesGlobPatterns(filePath: string, includePatterns: string[], excludePatterns: string[] = []): boolean {
  const normalizedPath = filePath.replace(/\\/g, '/');
  const isExcluded = excludePatterns.some(pattern => minimatch(normalizedPath, pattern, { dot: true }));
  if (isExcluded) {
    return false;
  }
  return includePatterns.some(pattern => minimatch(normalizedPath, pattern, { dot: true }));
}

export function extractFileNameAndExtension(filePath: string): {
  fileName: string;
  fileExtension: string;
} {
  const baseName = path.basename(filePath);
  const extension = path.extname(baseName);
  const fileNameWithoutExt = path.basename(baseName, extension);
  return {
    fileName: fileNameWithoutExt,
    fileExtension: extension.startsWith('.') ? extension.substring(1) : extension
  };
}

export async function measureAsyncExecutionTime<T>(fn: () => Promise<T>): Promise<T> {
  try {
    const result = await fn();
    return result;
  } catch (error) {
    throw error;
  }
}

export function ensureDirectoryExists(directoryPath: string): void {
  if (!fs.existsSync(directoryPath)) {
    fs.mkdirSync(directoryPath, { recursive: true });
  }
}
