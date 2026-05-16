import { ApiDocumentationGenerator } from '../src/tools/ApiDocumentationGenerator';
import { ArchitectureDocumentationGenerator } from '../src/tools/ArchitectureDocumentationGenerator';
import * as path from 'path';

async function main() {
  console.log('📚 Starting Documentation Generation...\n');

  const srcPath = path.join(process.cwd(), 'src');

  console.log('🔧 Generating API Documentation...');
  const apiGenerator = new ApiDocumentationGenerator({
    outputDir: './docs/api',
    includePrivate: false,
    includeInternal: false,
    includeExamples: true,
    excludePatterns: ['**/node_modules/**', '**/dist/**', '**/*.d.ts'],
  });

  apiGenerator.generate([srcPath]);
  apiGenerator.saveDocumentation('md');
  apiGenerator.saveDocumentation('json');
  apiGenerator.saveDocumentation('html');

  console.log('\n🔧 Generating Architecture Documentation...');
  const archGenerator = new ArchitectureDocumentationGenerator({
    outputDir: './docs/architecture',
    title: 'ArkTS Knowledge Graph System - Architecture',
    description: 'Complete architecture documentation of the ArkTS code knowledge graph system',
    includeDiagrams: true,
  });

  const archDoc = archGenerator.generate([srcPath]);
  archGenerator.saveDocumentation(archDoc, 'md');
  archGenerator.saveDocumentation(archDoc, 'json');
  archGenerator.saveDocumentation(archDoc, 'html');

  console.log('\n✅ Documentation generation complete!');
  console.log('   - API Documentation: ./docs/api/');
  console.log('   - Architecture Documentation: ./docs/architecture/');
}

if (require.main === module) {
  main().catch(console.error);
}

export default main;
