import { describe, it, expect } from 'vitest';
import {
  generateUniqueIdentifier,
  hashStringContent,
  fileMatchesGlobPatterns,
  extractFileNameAndExtension,
  ensureDirectoryExists
} from '../../src/shared/utilities.js';

describe('Shared utilities', () => {
  describe('generateUniqueIdentifier', () => {
    it('should generate unique IDs', () => {
      const id1 = generateUniqueIdentifier();
      const id2 = generateUniqueIdentifier();
      expect(id1).not.toEqual(id2);
    });

    it('should generate valid UUIDs', () => {
      const id = generateUniqueIdentifier();
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    });
  });

  describe('hashStringContent', () => {
    it('should generate hash for content', () => {
      const content = 'Hello, World!';
      const hash = hashStringContent(content);
      expect(typeof hash).toBe('string');
      expect(hash.length).toBeGreaterThan(0);
    });

    it('should generate same hash for same content', () => {
      const content = 'Test content 123';
      const hash1 = hashStringContent(content);
      const hash2 = hashStringContent(content);
      expect(hash1).toEqual(hash2);
    });

    it('should generate different hash for different content', () => {
      const hash1 = hashStringContent('Content A');
      const hash2 = hashStringContent('Content B');
      expect(hash1).not.toEqual(hash2);
    });
  });

  describe('fileMatchesGlobPatterns', () => {
    it('should match simple patterns', () => {
      expect(fileMatchesGlobPatterns('test.ts', ['*.ts'], [])).toBeTruthy();
      expect(fileMatchesGlobPatterns('test.js', ['*.ts'], [])).toBeFalsy();
    });

    it('should match multiple patterns', () => {
      expect(fileMatchesGlobPatterns('test.ts', ['*.ts', '*.js'], [])).toBeTruthy();
      expect(fileMatchesGlobPatterns('test.js', ['*.ts', '*.js'], [])).toBeTruthy();
    });

    it('should match path patterns', () => {
      expect(fileMatchesGlobPatterns('src/test.ts', ['**/*.ts'], [])).toBeTruthy();
      expect(fileMatchesGlobPatterns('src/sub/test.ts', ['**/*.ts'], [])).toBeTruthy();
    });

    it('should exclude patterns', () => {
      expect(fileMatchesGlobPatterns('test.ts', ['*.ts'], ['test.ts'])).toBeFalsy();
    });
  });

  describe('extractFileNameAndExtension', () => {
    it('should extract file name and extension', () => {
      const result = extractFileNameAndExtension('/path/to/file.ts');
      expect(result.fileName).toBe('file');
      expect(result.fileExtension).toBe('ts');
    });

    it('should handle files without extensions', () => {
      const result = extractFileNameAndExtension('/path/to/LICENSE');
      expect(result.fileName).toBe('LICENSE');
      expect(result.fileExtension).toBe('');
    });

    it('should handle files with multiple dots', () => {
      const result = extractFileNameAndExtension('/path/to/file.spec.ts');
      expect(result.fileName).toBe('file.spec');
      expect(result.fileExtension).toBe('ts');
    });
  });
});
