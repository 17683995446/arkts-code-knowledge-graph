import { Project, SyntaxKind } from 'ts-morph'
import { CodeEntityType, CodeRelationType, CodeParsingResult } from '../../shared'
import { applicationLogger } from '../../infrastructure/logger'
import { generateUniqueIdentifier, hashStringContent, extractFileNameAndExtension } from '../../shared/utilities'
import { SymbolTableManager } from '../symbol-table'

export class EnhancedTypeScriptCodeParser {
  private project: Project
  private symbolTableManager: SymbolTableManager

  constructor(symbolTableManager: SymbolTableManager) {
    this.project = new Project()
    this.symbolTableManager = symbolTableManager
  }

  parseFile(filePath: string): CodeParsingResult {
    applicationLogger.debug(`Parsing file: ${filePath}`)
    const sourceFile = this.project.addSourceFileAtPath(filePath)
    const entities: any[] = []
    const relations: any[] = []
    const fileSymbolTable = this.symbolTableManager.createFileSymbolTable(filePath)
    const fileEntity = this.createFileEntity(sourceFile)
    entities.push(fileEntity)
    const fileEntityId = fileEntity.entityId
    this.collectSymbols(sourceFile, fileEntityId, entities, fileSymbolTable)
    this.createRelations(sourceFile, fileEntityId, entities, relations, filePath)
    return {
      codeEntities: entities,
      codeRelations: relations,
    }
  }

  private collectSymbols(sourceFile: any, fileEntityId: string, entities: any[], fileSymbolTable: any): void {
    const classes = sourceFile.getClasses()
    for (const cls of classes) {
      this.parseClassForSymbolCollection(cls, fileEntityId, entities, fileSymbolTable)
    }
    const functions = sourceFile.getFunctions()
    for (const fn of functions) {
      this.parseFunctionForSymbolCollection(fn, fileEntityId, entities, fileSymbolTable)
    }
    const interfaces = sourceFile.getInterfaces()
    for (const iface of interfaces) {
      this.parseInterfaceForSymbolCollection(iface, fileEntityId, entities, fileSymbolTable)
    }
    const enums = sourceFile.getEnums()
    for (const enm of enums) {
      this.parseEnumForSymbolCollection(enm, fileEntityId, entities, fileSymbolTable)
    }
    const variables = sourceFile.getVariableDeclarations()
    for (const variable of variables) {
      this.parseVariableForSymbolCollection(variable, fileEntityId, entities, fileSymbolTable)
    }
  }

  private createRelations(
    sourceFile: any,
    fileEntityId: string,
    entities: any[],
    relations: any[],
    filePath: string
  ): void {
    this.parseImportsWithSymbols(sourceFile, fileEntityId, relations, filePath)
    this.parseStructureRelations(sourceFile, fileEntityId, entities, relations, filePath)
  }

  private createFileEntity(sourceFile: any): any {
    const filePath = sourceFile.getFilePath()
    const { fileName, fileExtension } = extractFileNameAndExtension(filePath)
    const fileContent = sourceFile.getFullText()
    const linesOfCode = fileContent.split('\n').length
    const fileEntityData = {
      type: CodeEntityType.FILE,
      filePath,
      fileName,
      fileExtension,
      linesOfCode,
      lastModifiedTimestamp: Date.now(),
      contentHash: hashStringContent(fileContent),
    }
    return {
      entityId: `file-${filePath}`,
      entityData: fileEntityData,
      sourceLocation: {
        filePath,
        line: 1,
        column: 1,
        endLine: linesOfCode,
        endColumn: 1,
      },
    }
  }

  private parseClassForSymbolCollection(cls: any, fileEntityId: string, entities: any[], fileSymbolTable: any): void {
    const className = cls.getName() || 'AnonymousClass'
    const entityId = `class-${fileEntityId}-${className}-${generateUniqueIdentifier()}`
    const classEntityData = {
      type: CodeEntityType.CLASS,
      className,
      isAbstract: cls.isAbstract(),
      isExported: cls.isExported(),
      isDefaultExport: cls.isDefaultExport(),
      accessModifiers: cls.getModifiers()?.map((m: any) => m.getText()) || [],
    }
    entities.push({
      entityId,
      entityData: classEntityData,
      sourceLocation: this.getSourceLocation(cls),
    })
    this.symbolTableManager.addSymbol(fileSymbolTable, className, entityId, CodeEntityType.CLASS, classEntityData)
    const methods = cls.getMethods()
    for (const method of methods) {
      this.parseMethodForSymbolCollection(method, entityId, entities, fileSymbolTable, [className])
    }
  }

  private parseMethodForSymbolCollection(
    method: any,
    classEntityId: string,
    entities: any[],
    fileSymbolTable: any,
    scopePath: string[]
  ): void {
    const methodName = method.getName()
    const entityId = `method-${classEntityId}-${methodName}-${generateUniqueIdentifier()}`
    const parameters = method.getParameters().map((param: any) => ({
      name: param.getName(),
      typeAnnotation: param.getTypeNode()?.getText(),
      defaultValue: param.getInitializer()?.getText(),
      isOptional: param.isOptional(),
      isRestParameter: param.isRestParameter(),
    }))
    const methodEntityData = {
      type: CodeEntityType.METHOD,
      functionName: methodName,
      isAsyncFunction: method.isAsync(),
      isExported: false,
      isDefaultExport: false,
      isGeneratorFunction: method.isGenerator(),
      parameters,
      returnTypeAnnotation: method.getReturnTypeNode()?.getText(),
      accessModifiers: method.getModifiers()?.map((m: any) => m.getText()) || [],
    }
    entities.push({
      entityId,
      entityData: methodEntityData,
      sourceLocation: this.getSourceLocation(method),
    })
    this.symbolTableManager.addSymbol(
      fileSymbolTable,
      methodName,
      entityId,
      CodeEntityType.METHOD,
      methodEntityData,
      scopePath
    )
  }

  private parseFunctionForSymbolCollection(fn: any, fileEntityId: string, entities: any[], fileSymbolTable: any): void {
    const functionName = fn.getName() || 'anonymousFunction'
    const entityId = `function-${fileEntityId}-${functionName}-${generateUniqueIdentifier()}`
    const parameters = fn.getParameters().map((param: any) => ({
      name: param.getName(),
      typeAnnotation: param.getTypeNode()?.getText(),
      defaultValue: param.getInitializer()?.getText(),
      isOptional: param.isOptional(),
      isRestParameter: param.isRestParameter(),
    }))
    const functionEntityData = {
      type: CodeEntityType.FUNCTION,
      functionName,
      isAsyncFunction: fn.isAsync(),
      isExported: fn.isExported(),
      isDefaultExport: fn.isDefaultExport(),
      isGeneratorFunction: fn.isGenerator(),
      parameters,
      returnTypeAnnotation: fn.getReturnTypeNode()?.getText(),
      accessModifiers: fn.getModifiers()?.map((m: any) => m.getText()) || [],
    }
    entities.push({
      entityId,
      entityData: functionEntityData,
      sourceLocation: this.getSourceLocation(fn),
    })
    this.symbolTableManager.addSymbol(
      fileSymbolTable,
      functionName,
      entityId,
      CodeEntityType.FUNCTION,
      functionEntityData
    )
  }

  private parseInterfaceForSymbolCollection(
    iface: any,
    fileEntityId: string,
    entities: any[],
    fileSymbolTable: any
  ): void {
    const interfaceName = iface.getName()
    const entityId = `interface-${fileEntityId}-${interfaceName}-${generateUniqueIdentifier()}`
    const interfaceEntityData = {
      type: CodeEntityType.INTERFACE,
      interfaceName,
      isExported: iface.isExported(),
      isDefaultExport: iface.isDefaultExport(),
    }
    entities.push({
      entityId,
      entityData: interfaceEntityData,
      sourceLocation: this.getSourceLocation(iface),
    })
    this.symbolTableManager.addSymbol(
      fileSymbolTable,
      interfaceName,
      entityId,
      CodeEntityType.INTERFACE,
      interfaceEntityData
    )
  }

  private parseEnumForSymbolCollection(enm: any, fileEntityId: string, entities: any[], fileSymbolTable: any): void {
    const enumName = enm.getName()
    const entityId = `enum-${fileEntityId}-${enumName}-${generateUniqueIdentifier()}`
    const enumEntityData = {
      type: CodeEntityType.ENUM,
      enumName,
      isExported: enm.isExported(),
      isDefaultExport: enm.isDefaultExport(),
      enumMemberNames: enm.getMembers().map((m: any) => m.getName()),
    }
    entities.push({
      entityId,
      entityData: enumEntityData,
      sourceLocation: this.getSourceLocation(enm),
    })
    this.symbolTableManager.addSymbol(fileSymbolTable, enumName, entityId, CodeEntityType.ENUM, enumEntityData)
  }

  private parseVariableForSymbolCollection(
    variable: any,
    fileEntityId: string,
    entities: any[],
    fileSymbolTable: any
  ): void {
    const variableName = variable.getName()
    const entityId = `variable-${fileEntityId}-${variableName}-${generateUniqueIdentifier()}`
    const declarationList = variable.getParentOrThrow()
    const declarationKind = declarationList.getDeclarationKind()
    const variableEntityData = {
      type: CodeEntityType.VARIABLE,
      variableName,
      variableTypeAnnotation: variable.getTypeNode()?.getText(),
      isConstDeclaration: declarationKind === 'const',
      isLetDeclaration: declarationKind === 'let',
      isExported: false,
      isDefaultExport: false,
      initialValueExpression: variable.getInitializer()?.getText(),
    }
    entities.push({
      entityId,
      entityData: variableEntityData,
      sourceLocation: this.getSourceLocation(variable),
    })
    this.symbolTableManager.addSymbol(
      fileSymbolTable,
      variableName,
      entityId,
      CodeEntityType.VARIABLE,
      variableEntityData
    )
  }

  private parseImportsWithSymbols(
    sourceFile: any,
    fileEntityId: string,
    relations: any[],
    filePath: string
  ): void {
    const fileSymbolTable = this.symbolTableManager.getFileSymbolTable(filePath)
    if (!fileSymbolTable) return
    const imports = sourceFile.getImportDeclarations()
    for (const imp of imports) {
      const moduleSpecifier = imp.getModuleSpecifier().getText().replace(/['"]/g, '')
      const importedBindings = imp.getNamedImports()
      const defaultImport = imp.getDefaultImport()
      if (defaultImport) {
        const importName = defaultImport.getText()
        this.symbolTableManager.addImportedSymbol(fileSymbolTable, importName, moduleSpecifier, importName, true)
      }
      for (const binding of importedBindings) {
        const name = binding.getName()
        this.symbolTableManager.addImportedSymbol(fileSymbolTable, name, moduleSpecifier, name, false)
      }
    }
  }

  private parseStructureRelations(
    sourceFile: any,
    fileEntityId: string,
    entities: any[],
    relations: any[],
    filePath: string
  ): void {
    for (const entity of entities) {
      if (entity.entityData.type !== CodeEntityType.FILE) {
        relations.push({
          relationId: `contains-${generateUniqueIdentifier()}`,
          sourceEntityId: fileEntityId,
          targetEntityId: entity.entityId,
          relationData: { type: CodeRelationType.CONTAINS },
        })
      }
    }
    const classes = sourceFile.getClasses()
    for (const cls of classes) {
      const className = cls.getName()
      const classEntity = entities.find((e: any) => 'className' in e.entityData && e.entityData.className === className)
      if (classEntity) {
        const extendsClause = cls.getExtends()
        if (extendsClause) {
          const parentName = extendsClause.getExpression().getText()
          const targetSymbol = this.symbolTableManager.findSymbol(parentName, filePath)
          if (targetSymbol) {
            relations.push({
              relationId: `extends-${generateUniqueIdentifier()}`,
              sourceEntityId: classEntity.entityId,
              targetEntityId: targetSymbol.entityId,
              relationData: { type: CodeRelationType.EXTENDS },
            })
          }
        }
        const implementsClauses = cls.getImplements()
        for (const implClause of implementsClauses) {
          const interfaceName = implClause.getExpression().getText()
          const targetSymbol = this.symbolTableManager.findSymbol(interfaceName, filePath)
          if (targetSymbol) {
            relations.push({
              relationId: `implements-${generateUniqueIdentifier()}`,
              sourceEntityId: classEntity.entityId,
              targetEntityId: targetSymbol.entityId,
              relationData: { type: CodeRelationType.IMPLEMENTS },
            })
          }
        }
      }
    }
    for (const entity of entities) {
      if (
        entity.entityData.type === CodeEntityType.FUNCTION ||
        entity.entityData.type === CodeEntityType.METHOD
      ) {
        this.parseCallsForEntity(entity, sourceFile, relations, filePath)
      }
    }
  }

  private parseCallsForEntity(entity: any, sourceFile: any, relations: any[], filePath: string): void {
    let node: any
    if (entity.entityData.type === CodeEntityType.FUNCTION) {
      const fnName = entity.entityData.functionName
      const functions = sourceFile.getFunctions()
      node = functions.find((fn: any) => fn.getName() === fnName)
    } else if (entity.entityData.type === CodeEntityType.METHOD) {
      const methodName = entity.entityData.functionName
      const classes = sourceFile.getClasses()
      for (const cls of classes) {
        const method = cls.getMethods().find((m: any) => m.getName() === methodName)
        if (method) {
          node = method
          break
        }
      }
    }
    if (node) {
      const callExpressions = node.getDescendantsOfKind(SyntaxKind.CallExpression)
      for (const call of callExpressions) {
        try {
          const expression = call.getExpression()
          let calleeName = expression.getText()
          if (calleeName.includes('.')) {
            const parts = calleeName.split('.')
            calleeName = parts[parts.length - 1]
          }
          const targetSymbol = this.symbolTableManager.findSymbol(calleeName, filePath)
          if (targetSymbol) {
            const startPos = call.getStart()
            relations.push({
              relationId: `calls-${generateUniqueIdentifier()}`,
              sourceEntityId: entity.entityId,
              targetEntityId: targetSymbol.entityId,
              relationData: {
                type: CodeRelationType.CALLS,
                callLineNumber: call.getStartLineNumber(),
                callColumnNumber: startPos,
              },
            })
          }
        } catch {
        }
      }
    }
  }

  private getSourceLocation(node: any): any {
    try {
      const lineNumber = node.getStartLineNumber()
      const columnNumber = node.getStartColumnNumber()
      return {
        line: lineNumber,
        column: columnNumber,
        endLine: node.getEndLineNumber?.() || lineNumber,
        endColumn: node.getEndColumnNumber?.() || columnNumber,
      }
    } catch {
      return undefined
    }
  }
}
