import * as fs from 'fs'
import * as path from 'path'
import * as babelParser from '@babel/parser'
import * as traverse from '@babel/traverse'
import * as t from '@babel/types'
import { applicationLogger } from '../../infrastructure/logger'
import { CodeParsingResult } from '../../shared'
import { SymbolTableManager } from '../symbol-table'

export class BabelCodeParser {
  private symbolTableManager: SymbolTableManager
  private filePath: string = ''
  private content: string = ''
  private entities: any[] = []
  private relations: any[] = []

  constructor(symbolTableManager: SymbolTableManager) {
    this.symbolTableManager = symbolTableManager
  }

  parse(filePath: string, content?: string): CodeParsingResult {
    this.filePath = filePath
    this.content = content || fs.readFileSync(filePath, 'utf-8')
    const fileEntity = this.createFileEntity()
    this.entities.push(fileEntity)
    this.symbolTableManager.createFileSymbolTable(filePath)
    try {
      const ast = babelParser.parse(this.content, {
        sourceType: 'module',
        plugins: [
          'typescript',
          'jsx',
          'decorators-legacy',
          'classProperties',
        ],
      })
      this.traverseAst(ast)
      applicationLogger.debug(`Parsed ${filePath}: ${this.entities.length} entities, ${this.relations.length} relations`)
    } catch (error) {
      applicationLogger.warn(`Failed to parse ${filePath}:`, error)
    }
    return {
      codeEntities: this.entities,
      codeRelations: this.relations,
    }
  }

  private createFileEntity(): any {
    const fileName = path.basename(this.filePath)
    const fileExtension = path.extname(this.filePath).substring(1)
    const linesOfCode = this.content.split('\n').length
    return {
      entityId: `file-${this.filePath}`,
      entityData: {
        type: 'File',
        name: fileName,
        filePath: this.filePath,
        fileName,
        fileExtension,
        linesOfCode,
        lastModifiedTimestamp: fs.statSync(this.filePath).mtimeMs,
        contentHash: this.hashContent(this.content),
      },
    }
  }

  private traverseAst(ast: any): void {
    const visitor: any = {
      ClassDeclaration: (path: any) => this.handleClassDeclaration(path.node),
      FunctionDeclaration: (path: any) => this.handleFunctionDeclaration(path.node),
      VariableDeclarator: (path: any) => {
        if (t.isArrowFunctionExpression(path.node.init) ||
          t.isFunctionExpression(path.node.init)) {
          this.handleFunctionExpression(path.node)
        }
      },
      TSInterfaceDeclaration: (path: any) => this.handleInterfaceDeclaration(path.node),
      TSTypeAliasDeclaration: (path: any) => this.handleTypeAliasDeclaration(path.node),
      EnumDeclaration: (path: any) => this.handleEnumDeclaration(path.node),
      ImportDeclaration: (path: any) => this.handleImportDeclaration(path.node),
      CallExpression: (path: any) => this.handleCallExpression(path.node),
      ClassMethod: (path: any) => this.handleClassMethod(path.node),
      ClassProperty: (path: any) => this.handleClassProperty(path.node),
    }
    traverse.default(ast, visitor)
  }

  private handleClassDeclaration(node: any): void {
    const className = node.id?.name || 'AnonymousClass'
    const entityId = `class-${className}-${path.basename(this.filePath)}`
    const classEntity = {
      entityId,
      entityData: {
        type: 'Class',
        name: className,
        qualifiedName: `${this.filePath}:${className}`,
        isExported: false,
        isDefaultExport: false,
        extends: node.superClass ? [this.getExpressionName(node.superClass)] : [],
        linesOfCode: this.getNodeLines(node),
        complexity: 1,
      },
    }
    this.entities.push(classEntity)
    const fileSymbolTable = this.symbolTableManager.getFileSymbolTable(this.filePath)
    if (fileSymbolTable) {
      this.symbolTableManager.addSymbol(fileSymbolTable, className, entityId, 'Class', classEntity.entityData)
    }
    this.addContainsRelation(`file-${this.filePath}`, entityId, 'Class')
    if (node.superClass) {
      this.addRelation(
        `extends-${entityId}-${this.getExpressionName(node.superClass)}`,
        entityId,
        `unknown-${this.getExpressionName(node.superClass)}`,
        'EXTENDS',
        { type: 'EXTENDS', targetName: this.getExpressionName(node.superClass) }
      )
    }
  }

  private handleFunctionDeclaration(node: any): void {
    const funcName = node.id?.name || 'anonymous'
    const entityId = `function-${funcName}-${path.basename(this.filePath)}`
    const funcEntity = {
      entityId,
      entityData: {
        type: 'Function',
        name: funcName,
        qualifiedName: `${this.filePath}:${funcName}`,
        isExported: false,
        isDefaultExport: false,
        parameters: node.params?.map((p: any) => this.getParameterName(p)) || [],
        linesOfCode: this.getNodeLines(node),
        complexity: this.calculateComplexity(node.body),
      },
    }
    this.entities.push(funcEntity)
    const fileSymbolTable = this.symbolTableManager.getFileSymbolTable(this.filePath)
    if (fileSymbolTable) {
      this.symbolTableManager.addSymbol(fileSymbolTable, funcName, entityId, 'Function', funcEntity.entityData)
    }
    this.addContainsRelation(`file-${this.filePath}`, entityId, 'Function')
  }

  private handleFunctionExpression(node: any): void {
    const varName = node.id && t.isIdentifier(node.id) ? node.id.name : 'anonymous'
    const entityId = `function-${varName}-${path.basename(this.filePath)}`
    const isArrow = t.isArrowFunctionExpression(node.init)
    const funcEntity = {
      entityId,
      entityData: {
        type: 'Function',
        name: varName,
        qualifiedName: `${this.filePath}:${varName}`,
        isExported: false,
        isDefaultExport: false,
        isArrowFunction: isArrow,
        parameters: node.init?.params?.map((p: any) => this.getParameterName(p)) || [],
        linesOfCode: this.getNodeLines(node.init),
        complexity: this.calculateComplexity(node.init?.body),
      },
    }
    this.entities.push(funcEntity)
    this.addContainsRelation(`file-${this.filePath}`, entityId, 'Function')
  }

  private handleInterfaceDeclaration(node: any): void {
    const interfaceName = node.id?.name || 'AnonymousInterface'
    const entityId = `interface-${interfaceName}-${path.basename(this.filePath)}`
    const interfaceEntity = {
      entityId,
      entityData: {
        type: 'Interface',
        name: interfaceName,
        qualifiedName: `${this.filePath}:${interfaceName}`,
        isExported: false,
        linesOfCode: this.getNodeLines(node),
      },
    }
    this.entities.push(interfaceEntity)
    const fileSymbolTable = this.symbolTableManager.getFileSymbolTable(this.filePath)
    if (fileSymbolTable) {
      this.symbolTableManager.addSymbol(fileSymbolTable, interfaceName, entityId, 'Interface', interfaceEntity.entityData)
    }
    this.addContainsRelation(`file-${this.filePath}`, entityId, 'Interface')
  }

  private handleTypeAliasDeclaration(node: any): void {
    const typeName = node.id?.name || 'AnonymousType'
    const entityId = `type-${typeName}-${path.basename(this.filePath)}`
    const typeEntity = {
      entityId,
      entityData: {
        type: 'TypeAlias',
        name: typeName,
        qualifiedName: `${this.filePath}:${typeName}`,
        isExported: false,
        linesOfCode: this.getNodeLines(node),
      },
    }
    this.entities.push(typeEntity)
    const fileSymbolTable = this.symbolTableManager.getFileSymbolTable(this.filePath)
    if (fileSymbolTable) {
      this.symbolTableManager.addSymbol(fileSymbolTable, typeName, entityId, 'TypeAlias', typeEntity.entityData)
    }
  }

  private handleEnumDeclaration(node: any): void {
    const enumName = node.id?.name || 'AnonymousEnum'
    const entityId = `enum-${enumName}-${path.basename(this.filePath)}`
    const enumEntity = {
      entityId,
      entityData: {
        type: 'Enum',
        name: enumName,
        qualifiedName: `${this.filePath}:${enumName}`,
        isExported: false,
        members: node.members?.map((m: any) => m.id?.name || 'unknown') || [],
        linesOfCode: this.getNodeLines(node),
      },
    }
    this.entities.push(enumEntity)
    const fileSymbolTable = this.symbolTableManager.getFileSymbolTable(this.filePath)
    if (fileSymbolTable) {
      this.symbolTableManager.addSymbol(fileSymbolTable, enumName, entityId, 'Enum', enumEntity.entityData)
    }
    this.addContainsRelation(`file-${this.filePath}`, entityId, 'Enum')
  }

  private handleImportDeclaration(node: any): void {
    const modulePath = node.source.value
    for (const specifier of node.specifiers) {
      if (t.isImportSpecifier(specifier)) {
        const localName = specifier.local.name
        const importedName = specifier.imported.name
        const fileSymbolTable = this.symbolTableManager.getFileSymbolTable(this.filePath)
        if (fileSymbolTable) {
          this.symbolTableManager.addImportedSymbol(fileSymbolTable, localName, modulePath, importedName, false)
        }
        this.addRelation(
          `import-${localName}-${modulePath}`,
          `file-${this.filePath}`,
          `unknown-${importedName}`,
          'IMPORTS',
          { type: 'IMPORTS', modulePath, importedName }
        )
      } else if (t.isImportDefaultSpecifier(specifier)) {
        const localName = specifier.local.name
        const fileSymbolTable = this.symbolTableManager.getFileSymbolTable(this.filePath)
        if (fileSymbolTable) {
          this.symbolTableManager.addImportedSymbol(fileSymbolTable, localName, modulePath, 'default', true)
        }
      }
    }
  }

  private handleCallExpression(node: any): void {
    const calleeName = this.getCalleeName(node.callee)
    if (!calleeName || this.isBuiltin(calleeName)) {
      return
    }
    const currentEntityId = this.entities.length > 0
      ? this.entities[this.entities.length - 1].entityId
      : `file-${this.filePath}`
    this.addRelation(
      `calls-${Date.now()}-${Math.random()}`,
      currentEntityId,
      `unknown-${calleeName}`,
      'CALLS',
      { type: 'CALLS', targetName: calleeName }
    )
  }

  private handleClassMethod(node: any): void {
    const methodName = node.key?.name || 'anonymous'
    const entityId = `method-${methodName}-${path.basename(this.filePath)}`
    const methodEntity = {
      entityId,
      entityData: {
        type: 'Method',
        name: methodName,
        qualifiedName: `${this.filePath}:${methodName}`,
        isStatic: node.static,
        isAsync: node.async,
        parameters: node.params?.map((p: any) => this.getParameterName(p)) || [],
        linesOfCode: this.getNodeLines(node),
        complexity: this.calculateComplexity(node.body),
      },
    }
    this.entities.push(methodEntity)
  }

  private handleClassProperty(node: any): void {
    const propName = node.key?.name || 'unknown'
    const entityId = `property-${propName}-${path.basename(this.filePath)}`
    const propEntity = {
      entityId,
      entityData: {
        type: 'Property',
        name: propName,
        qualifiedName: `${this.filePath}:${propName}`,
        isStatic: node.static,
      },
    }
    this.entities.push(propEntity)
  }

  private addContainsRelation(sourceId: string, targetId: string, targetType: string): void {
    this.addRelation(
      `contains-${sourceId}-${targetId}`,
      sourceId,
      targetId,
      'CONTAINS',
      { type: 'CONTAINS', targetType }
    )
  }

  private addRelation(
    relationId: string,
    sourceEntityId: string,
    targetEntityId: string,
    relationType: string,
    relationData: any
  ): void {
    this.relations.push({
      relationId,
      sourceEntityId,
      targetEntityId,
      relationType,
      relationData,
    })
  }

  private getExpressionName(expr: any): string {
    if (!expr) return 'Object'
    if (t.isIdentifier(expr)) return expr.name
    if (t.isMemberExpression(expr)) {
      return `${this.getExpressionName(expr.object)}.${this.getExpressionName(expr.property)}`
    }
    return 'unknown'
  }

  private getParameterName(param: any): string {
    if (!param) return 'unknown'
    if (t.isIdentifier(param)) return param.name
    if (t.isAssignmentPattern(param)) return this.getParameterName(param.left)
    if (t.isRestElement(param)) return `...${this.getParameterName(param.argument)}`
    return 'unknown'
  }

  private getNodeLines(node: any): number {
    if (!node || !node.loc) return 1
    return node.loc.end.line - node.loc.start.line + 1
  }

  private calculateComplexity(body: any): number {
    if (!body) return 1
    let complexity = 1
    const visitor: any = {
      IfStatement: () => complexity++,
      ForStatement: () => complexity++,
      ForInStatement: () => complexity++,
      ForOfStatement: () => complexity++,
      WhileStatement: () => complexity++,
      DoWhileStatement: () => complexity++,
      SwitchCase: () => complexity++,
      CatchClause: () => complexity++,
      ConditionalExpression: () => complexity++,
      LogicalExpression: (path: any) => {
        if (path.node.operator === '&&' || path.node.operator === '||') {
          complexity++
        }
      },
    }
    try {
      traverse.default(body, visitor)
    } catch {
    }
    return Math.min(complexity, 20)
  }

  private getCalleeName(callee: any): string | null {
    if (!callee) return null
    if (t.isIdentifier(callee)) return callee.name
    if (t.isMemberExpression(callee)) return this.getExpressionName(callee)
    return null
  }

  private isBuiltin(name: string): boolean {
    const builtins = new Set([
      'console.log', 'console.error', 'console.warn', 'console.info',
      'Math.random', 'Math.floor', 'Math.ceil', 'Math.round', 'Math.max', 'Math.min',
      'Array.isArray', 'Array.from', 'Array.of',
      'Object.keys', 'Object.values', 'Object.entries',
      'parseInt', 'parseFloat',
      'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval',
      'Promise.resolve', 'Promise.reject', 'Promise.all', 'Promise.race',
    ])
    return builtins.has(name)
  }

  private hashContent(content: string): string {
    let hash = 0
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    return Math.abs(hash).toString(16)
  }
}
