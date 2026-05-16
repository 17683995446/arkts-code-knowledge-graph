import * as fs from 'fs';
import * as path from 'path';
import { globSync } from 'glob';
import * as ts from 'typescript';

export interface DocumentationConfig {
  outputDir: string;
  includePrivate: boolean;
  includeInternal: boolean;
  includeExamples: boolean;
  excludePatterns: string[];
}

export interface ApiDoc {
  name: string;
  kind: string;
  file: string;
  line: number;
  description?: string;
  members?: ApiDoc[];
  parameters?: ParameterDoc[];
  returns?: string;
  throws?: string[];
  examples?: string[];
  remarks?: string;
  see?: string[];
  deprecated?: string;
}

export interface ParameterDoc {
  name: string;
  type: string;
  description?: string;
  optional?: boolean;
  defaultValue?: string;
}

export class ApiDocumentationGenerator {
  private config: DocumentationConfig;
  private docs: Map<string, ApiDoc> = new Map();
  private program: ts.Program | null = null;

  constructor(config: Partial<DocumentationConfig> = {}) {
    this.config = {
      outputDir: './docs/api',
      includePrivate: false,
      includeInternal: false,
      includeExamples: true,
      excludePatterns: ['**/node_modules/**', '**/*.d.ts', '**/dist/**'],
      ...config,
    };
  }

  public generate(sourcePaths: string[]): Map<string, ApiDoc> {
    console.log(`\n📝 Generating API documentation...`);
    console.log(`   Source paths: ${sourcePaths.join(', ')}`);
    console.log(`   Output directory: ${this.config.outputDir}`);

    const files = this.collectSourceFiles(sourcePaths);
    console.log(`   Found ${files.length} TypeScript files`);

    if (files.length === 0) {
      console.log(`   ⚠️  No TypeScript files found`);
      return this.docs;
    }

    this.program = ts.createProgram(files, {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
      declaration: true,
      noEmit: true,
    });

    const checker = this.program.getTypeChecker();

    for (const sourceFile of this.program.getSourceFiles()) {
      if (this.shouldProcessFile(sourceFile.fileName)) {
        this.processSourceFile(sourceFile, checker);
      }
    }

    console.log(`   ✅ Generated ${this.docs.size} API documentation entries`);

    return this.docs;
  }

  private collectSourceFiles(sourcePaths: string[]): string[] {
    const files: string[] = [];

    for (const sourcePath of sourcePaths) {
      const pattern = path.isAbsolute(sourcePath)
        ? sourcePath
        : path.join(process.cwd(), sourcePath, '**/*.ts');

      const found = globSync(pattern, {
        ignore: this.config.excludePatterns,
      });

      files.push(...found);
    }

    return files;
  }

  private shouldProcessFile(filePath: string): boolean {
    for (const pattern of this.config.excludePatterns) {
      if (filePath.includes(pattern.replace('**/*', ''))) {
        return false;
      }
    }
    return true;
  }

  private processSourceFile(sourceFile: ts.SourceFile, checker: ts.TypeChecker): void {
    const visit = (node: ts.Node) => {
      if (ts.isClassDeclaration(node)) {
        this.processClass(node, sourceFile, checker);
      } else if (ts.isInterfaceDeclaration(node)) {
        this.processInterface(node, sourceFile, checker);
      } else if (ts.isTypeAliasDeclaration(node)) {
        this.processTypeAlias(node, sourceFile, checker);
      } else if (ts.isFunctionDeclaration(node)) {
        this.processFunction(node, sourceFile, checker);
      } else if (ts.isEnumDeclaration(node)) {
        this.processEnum(node, sourceFile, checker);
      }

      ts.forEachChild(node, visit);
    };

    ts.forEachChild(sourceFile, visit);
  }

  private processClass(
    node: ts.ClassDeclaration,
    sourceFile: ts.SourceFile,
    checker: ts.TypeChecker
  ): void {
    if (!node.name) return;

    const doc = this.extractJsDoc(node, sourceFile);
    doc.name = node.name.text;
    doc.kind = 'class';

    const members: ApiDoc[] = [];
    for (const member of node.members) {
      if (ts.isMethodDeclaration(member) || ts.isPropertyDeclaration(member)) {
        const memberDoc = this.extractMemberDoc(member, sourceFile, checker);
        if (memberDoc) {
          members.push(memberDoc);
        }
      }
    }
    doc.members = members;

    this.docs.set(doc.name, doc);
  }

  private processInterface(
    node: ts.InterfaceDeclaration,
    sourceFile: ts.SourceFile,
    checker: ts.TypeChecker
  ): void {
    const doc = this.extractJsDoc(node, sourceFile);
    doc.name = node.name.text;
    doc.kind = 'interface';

    const members: ApiDoc[] = [];
    for (const member of node.members) {
      if (ts.isPropertySignature(member) || ts.isMethodSignature(member)) {
        const memberDoc = this.extractInterfaceMemberDoc(member, sourceFile, checker);
        if (memberDoc) {
          members.push(memberDoc);
        }
      }
    }
    doc.members = members;

    this.docs.set(doc.name, doc);
  }

  private processTypeAlias(
    node: ts.TypeAliasDeclaration,
    sourceFile: ts.SourceFile,
    checker: ts.TypeChecker
  ): void {
    const doc = this.extractJsDoc(node, sourceFile);
    doc.name = node.name.text;
    doc.kind = 'type';

    const type = checker.getTypeAtLocation(node);
    doc.description = checker.typeToString(type);

    this.docs.set(doc.name, doc);
  }

  private processFunction(
    node: ts.FunctionDeclaration,
    sourceFile: ts.SourceFile,
    checker: ts.TypeChecker
  ): void {
    if (!node.name) return;

    const doc = this.extractJsDoc(node, sourceFile);
    doc.name = node.name.text;
    doc.kind = 'function';
    doc.parameters = this.extractParameters(node.parameters, sourceFile, checker);

    if (node.type) {
      doc.returns = checker.typeToString(checker.getTypeAtLocation(node.type));
    }

    this.docs.set(doc.name, doc);
  }

  private processEnum(
    node: ts.EnumDeclaration,
    sourceFile: ts.SourceFile,
    checker: ts.TypeChecker
  ): void {
    const doc = this.extractJsDoc(node, sourceFile);
    doc.name = node.name.text;
    doc.kind = 'enum';

    const members: ApiDoc[] = [];
    for (const member of node.members) {
      if (ts.isEnumMember(member)) {
        const memberDoc: ApiDoc = {
          name: member.name.getText(sourceFile),
          kind: 'enum-member',
          file: sourceFile.fileName,
          line: member.pos,
        };

        const memberDocTags = this.getJsDocTags(member, sourceFile);
        if (memberDocTags.description) {
          memberDoc.description = memberDocTags.description;
        }

        members.push(memberDoc);
      }
    }
    doc.members = members;

    this.docs.set(doc.name, doc);
  }

  private extractJsDoc(node: ts.Node, sourceFile: ts.SourceFile): ApiDoc {
    const doc: ApiDoc = {
      name: '',
      kind: '',
      file: sourceFile.fileName,
      line: node.getStart(),
    };

    const jsDocTags = this.getJsDocTags(node, sourceFile);

    if (jsDocTags.description) {
      doc.description = jsDocTags.description;
    }
    if (jsDocTags.returns) {
      doc.returns = jsDocTags.returns;
    }
    if (jsDocTags.throws) {
      doc.throws = jsDocTags.throws;
    }
    if (jsDocTags.examples) {
      doc.examples = jsDocTags.examples;
    }
    if (jsDocTags.remarks) {
      doc.remarks = jsDocTags.remarks;
    }
    if (jsDocTags.see) {
      doc.see = jsDocTags.see;
    }
    if (jsDocTags.deprecated) {
      doc.deprecated = jsDocTags.deprecated;
    }

    return doc;
  }

  private getJsDocTags(
    node: ts.Node,
    sourceFile: ts.SourceFile
  ): {
    description?: string;
    returns?: string;
    throws?: string[];
    examples?: string[];
    remarks?: string;
    see?: string[];
    deprecated?: string;
  } {
    const tags: any = {};

    const jsDoc = ts.getJSDocComments(node, sourceFile);
    if (jsDoc && jsDoc.length > 0) {
      const comment = jsDoc[0];
      if (ts.isJSDocComment(comment) && comment.comment) {
        tags.description = comment.comment as string;
      }
    }

    return tags;
  }

  private extractParameters(
    parameters: ts.NodeArray<ts.ParameterDeclaration>,
    sourceFile: ts.SourceFile,
    checker: ts.TypeChecker
  ): ParameterDoc[] {
    const params: ParameterDoc[] = [];

    for (const param of parameters) {
      const paramDoc: ParameterDoc = {
        name: param.name.getText(sourceFile),
        type: param.type ? checker.typeToString(checker.getTypeAtLocation(param.type)) : 'any',
      };

      if (param.questionToken) {
        paramDoc.optional = true;
      }

      if (param.initializer) {
        paramDoc.defaultValue = param.initializer.getText(sourceFile);
      }

      const jsDoc = ts.getJSDocComments(param, sourceFile);
      if (jsDoc && jsDoc.length > 0) {
        const comment = jsDoc[0];
        if (ts.isJSDocComment(comment) && comment.comment) {
          paramDoc.description = comment.comment as string;
        }
      }

      params.push(paramDoc);
    }

    return params;
  }

  private extractMemberDoc(
    node: ts.MethodDeclaration | ts.PropertyDeclaration,
    sourceFile: ts.SourceFile,
    checker: ts.TypeChecker
  ): ApiDoc | null {
    const name = node.name?.getText(sourceFile);
    if (!name) return null;

    const doc: ApiDoc = {
      name,
      kind: ts.isMethodDeclaration(node) ? 'method' : 'property',
      file: sourceFile.fileName,
      line: node.getStart(),
    };

    if (ts.isMethodDeclaration(node)) {
      doc.parameters = this.extractParameters(node.parameters, sourceFile, checker);

      if (node.type) {
        doc.returns = checker.typeToString(checker.getTypeAtLocation(node.type));
      }
    } else if (node.type) {
      doc.description = checker.typeToString(checker.getTypeAtLocation(node.type));
    }

    const jsDocTags = this.getJsDocTags(node, sourceFile);
    if (jsDocTags.description) {
      doc.description = jsDocTags.description;
    }
    if (jsDocTags.deprecated) {
      doc.deprecated = jsDocTags.deprecated;
    }

    return doc;
  }

  private extractInterfaceMemberDoc(
    node: ts.PropertySignature | ts.MethodSignature,
    sourceFile: ts.SourceFile,
    checker: ts.TypeChecker
  ): ApiDoc | null {
    const name = node.name?.getText(sourceFile);
    if (!name) return null;

    const doc: ApiDoc = {
      name,
      kind: ts.isMethodSignature(node) ? 'method' : 'property',
      file: sourceFile.fileName,
      line: node.getStart(),
    };

    if (ts.isMethodSignature(node)) {
      if (node.parameters) {
        doc.parameters = this.extractParameters(
          ts.createNodeArray(node.parameters) as any,
          sourceFile,
          checker
        );
      }
      if (node.type) {
        doc.returns = checker.typeToString(checker.getTypeAtLocation(node.type));
      }
    } else if (node.type) {
      doc.description = checker.typeToString(checker.getTypeAtLocation(node.type));
    }

    return doc;
  }

  public saveDocumentation(format: 'json' | 'md' | 'html' = 'md'): void {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    if (!fs.existsSync(this.config.outputDir)) {
      fs.mkdirSync(this.config.outputDir, { recursive: true });
    }

    switch (format) {
      case 'json':
        this.saveJsonDocumentation(timestamp);
        break;
      case 'md':
        this.saveMarkdownDocumentation(timestamp);
        break;
      case 'html':
        this.saveHtmlDocumentation(timestamp);
        break;
    }
  }

  private saveJsonDocumentation(timestamp: string): void {
    const filepath = path.join(this.config.outputDir, `api-docs-${timestamp}.json`);
    const data = Object.fromEntries(this.docs);
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
    console.log(`   ✅ JSON documentation saved to: ${filepath}`);
  }

  private saveMarkdownDocumentation(timestamp: string): void {
    const filepath = path.join(this.config.outputDir, `api-docs-${timestamp}.md`);
    let md = `# API Documentation\n\n`;
    md += `Generated: ${new Date().toISOString()}\n\n`;
    md += `## Table of Contents\n\n`;

    const classes = Array.from(this.docs.values()).filter((d) => d.kind === 'class');
    const interfaces = Array.from(this.docs.values()).filter((d) => d.kind === 'interface');
    const functions = Array.from(this.docs.values()).filter((d) => d.kind === 'function');
    const types = Array.from(this.docs.values()).filter((d) => d.kind === 'type');
    const enums = Array.from(this.docs.values()).filter((d) => d.kind === 'enum');

    if (classes.length > 0) {
      md += `- [Classes](#classes)\n`;
    }
    if (interfaces.length > 0) {
      md += `- [Interfaces](#interfaces)\n`;
    }
    if (functions.length > 0) {
      md += `- [Functions](#functions)\n`;
    }
    if (types.length > 0) {
      md += `- [Types](#types)\n`;
    }
    if (enums.length > 0) {
      md += `- [Enums](#enums)\n`;
    }

    if (classes.length > 0) {
      md += `\n## Classes\n\n`;
      for (const doc of classes) {
        md += this.formatDocAsMarkdown(doc);
      }
    }

    if (interfaces.length > 0) {
      md += `\n## Interfaces\n\n`;
      for (const doc of interfaces) {
        md += this.formatDocAsMarkdown(doc);
      }
    }

    if (functions.length > 0) {
      md += `\n## Functions\n\n`;
      for (const doc of functions) {
        md += this.formatDocAsMarkdown(doc);
      }
    }

    if (types.length > 0) {
      md += `\n## Types\n\n`;
      for (const doc of types) {
        md += this.formatDocAsMarkdown(doc);
      }
    }

    if (enums.length > 0) {
      md += `\n## Enums\n\n`;
      for (const doc of enums) {
        md += this.formatDocAsMarkdown(doc);
      }
    }

    fs.writeFileSync(filepath, md);
    console.log(`   ✅ Markdown documentation saved to: ${filepath}`);
  }

  private formatDocAsMarkdown(doc: ApiDoc): string {
    let md = `### ${doc.name}\n\n`;
    md += `**Kind:** ${doc.kind}\n\n`;
    md += `**File:** \`${doc.file}\` (line ${doc.line})\n\n`;

    if (doc.description) {
      md += `${doc.description}\n\n`;
    }

    if (doc.deprecated) {
      md += `> ⚠️ **DEPRECATED:** ${doc.deprecated}\n\n`;
    }

    if (doc.parameters && doc.parameters.length > 0) {
      md += `#### Parameters\n\n`;
      md += `| Name | Type | Description |\n`;
      md += `|------|------|-------------|\n`;
      for (const param of doc.parameters) {
        const optional = param.optional ? ' (optional)' : '';
        const defaultValue = param.defaultValue ? ` = ${param.defaultValue}` : '';
        md += `| \`${param.name}${defaultValue}${optional}\` | \`${param.type}\` | ${param.description || ''} |\n`;
      }
      md += `\n`;
    }

    if (doc.returns) {
      md += `#### Returns\n\n`;
      md += `\`${doc.returns}\`\n\n`;
    }

    if (doc.throws) {
      md += `#### Throws\n\n`;
      for (const error of doc.throws) {
        md += `- ${error}\n`;
      }
      md += `\n`;
    }

    if (doc.members && doc.members.length > 0) {
      md += `#### Members\n\n`;
      for (const member of doc.members) {
        md += `- \`${member.name}\`${member.description ? `: ${member.description}` : ''}\n`;
      }
      md += `\n`;
    }

    if (doc.examples && doc.examples.length > 0) {
      md += `#### Examples\n\n`;
      for (const example of doc.examples) {
        md += `\`\`\`typescript\n${example}\n\`\`\`\n\n`;
      }
    }

    if (doc.see && doc.see.length > 0) {
      md += `#### See Also\n\n`;
      for (const reference of doc.see) {
        md += `- ${reference}\n`;
      }
      md += `\n`;
    }

    md += `---\n\n`;

    return md;
  }

  private saveHtmlDocumentation(timestamp: string): void {
    const filepath = path.join(this.config.outputDir, `api-docs-${timestamp}.html`);
    let html = `<!DOCTYPE html>
<html>
<head>
  <title>API Documentation</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; }
    h1 { color: #333; border-bottom: 3px solid #4CAF50; padding-bottom: 10px; }
    h2 { color: #555; margin-top: 40px; }
    h3 { color: #666; }
    .doc { background: #f9f9f9; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #4CAF50; }
    .doc h3 { margin-top: 0; }
    .kind { color: #888; font-size: 14px; }
    .deprecated { background: #fff3cd; padding: 10px; border-radius: 4px; margin: 10px 0; }
    code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; }
    pre { background: #2d2d2d; color: #f8f8f2; padding: 15px; border-radius: 8px; overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
    th { background-color: #4CAF50; color: white; }
  </style>
</head>
<body>
  <div class="container">
    <h1>📚 API Documentation</h1>
    <p>Generated: ${new Date().toISOString()}</p>`;

    const classes = Array.from(this.docs.values()).filter((d) => d.kind === 'class');
    const interfaces = Array.from(this.docs.values()).filter((d) => d.kind === 'interface');
    const functions = Array.from(this.docs.values()).filter((d) => d.kind === 'function');

    if (classes.length > 0) {
      html += `<h2>Classes</h2>`;
      for (const doc of classes) {
        html += this.formatDocAsHtml(doc);
      }
    }

    if (interfaces.length > 0) {
      html += `<h2>Interfaces</h2>`;
      for (const doc of interfaces) {
        html += this.formatDocAsHtml(doc);
      }
    }

    if (functions.length > 0) {
      html += `<h2>Functions</h2>`;
      for (const doc of functions) {
        html += this.formatDocAsHtml(doc);
      }
    }

    html += `
  </div>
</body>
</html>`;

    fs.writeFileSync(filepath, html);
    console.log(`   ✅ HTML documentation saved to: ${filepath}`);
  }

  private formatDocAsHtml(doc: ApiDoc): string {
    let html = `<div class="doc">`;
    html += `<h3>${doc.name}</h3>`;
    html += `<p class="kind">${doc.kind}</p>`;

    if (doc.description) {
      html += `<p>${doc.description}</p>`;
    }

    if (doc.deprecated) {
      html += `<div class="deprecated">⚠️ DEPRECATED: ${doc.deprecated}</div>`;
    }

    if (doc.parameters && doc.parameters.length > 0) {
      html += `<h4>Parameters</h4><table><tr><th>Name</th><th>Type</th><th>Description</th></tr>`;
      for (const param of doc.parameters) {
        html += `<tr><td><code>${param.name}</code></td><td><code>${param.type}</code></td><td>${param.description || ''}</td></tr>`;
      }
      html += `</table>`;
    }

    if (doc.returns) {
      html += `<h4>Returns</h4><p><code>${doc.returns}</code></p>`;
    }

    html += `</div>`;

    return html;
  }

  public getDocs(): Map<string, ApiDoc> {
    return this.docs;
  }
}

export default ApiDocumentationGenerator;
