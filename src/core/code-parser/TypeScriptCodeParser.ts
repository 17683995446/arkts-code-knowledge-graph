import { Project, SyntaxKind, Node } from 'ts-morph';
import { CodeEntityType, CodeRelationType, CodeParsingResult } from '../../shared/index.js';
import { applicationLogger } from '../../infrastructure/logger/index.js';
import { generateUniqueIdentifier, hashStringContent, extractFileNameAndExtension } from '../../shared/utilities.js';

/** TypeScript 代码解析器 - 改进版 */
export class TypeScriptCodeParser {
    private project: Project;

    constructor() {
        this.project = new Project();
    }

    /**
     * 解析单个 TypeScript/JavaScript 文件
     */
    parseFile(filePath: string): CodeParsingResult {
        applicationLogger.debug(`Parsing file: ${filePath}`);
        const sourceFile = this.project.addSourceFileAtPath(filePath);
        const entities: CodeParsingResult['codeEntities'] = [];
        const relations: CodeParsingResult['codeRelations'] = [];

        const fileEntity = this.createFileEntity(sourceFile);
        entities.push(fileEntity);
        const fileEntityId = fileEntity.entityId;

        const classes = sourceFile.getClasses();
        for (const cls of classes) {
            this.parseClass(cls, fileEntityId, entities, relations);
        }

        const functions = sourceFile.getFunctions();
        for (const fn of functions) {
            this.parseFunction(fn, fileEntityId, entities, relations);
        }

        const interfaces = sourceFile.getInterfaces();
        for (const iface of interfaces) {
            this.parseInterface(iface, fileEntityId, entities, relations);
        }

        const enums = sourceFile.getEnums();
        for (const enm of enums) {
            this.parseEnum(enm, fileEntityId, entities, relations);
        }

        const variables = sourceFile.getVariableDeclarations();
        for (const variable of variables) {
            this.parseVariable(variable, fileEntityId, entities, relations);
        }

        this.parseImports(sourceFile, fileEntityId, relations);

        return {
            codeEntities: entities,
            codeRelations: relations
        };
    }

    /**
     * 创建文件代码实体
     */
    private createFileEntity(sourceFile: Node) {
        const filePath = (sourceFile as any).getFilePath();
        const { fileName, fileExtension } = extractFileNameAndExtension(filePath);
        const fileContent = (sourceFile as any).getFullText();
        const linesOfCode = fileContent.split('\n').length;

        const fileEntityData = {
            type: CodeEntityType.FILE,
            filePath,
            fileName,
            fileExtension,
            linesOfCode,
            lastModifiedTimestamp: Date.now(),
            contentHash: hashStringContent(fileContent)
        };

        return {
            entityId: `file-${filePath}`,
            entityData: fileEntityData,
            sourceLocation: {
                filePath,
                line: 1,
                column: 1,
                endLine: linesOfCode,
                endColumn: 1
            }
        };
    }

    /**
     * 解析类声明
     */
    private parseClass(cls: any, fileEntityId: string, entities: any[], relations: any[]) {
        const className = cls.getName() || 'AnonymousClass';
        const entityId = `class-${fileEntityId}-${className}-${generateUniqueIdentifier()}`;
        const extendsClause = cls.getExtends();
        const implementsClauses = cls.getImplements();

        const classEntityData = {
            type: CodeEntityType.CLASS,
            className,
            isAbstract: cls.isAbstract(),
            isExported: cls.isExported(),
            isDefaultExport: cls.isDefaultExport(),
            accessModifiers: cls.getModifiers()?.map((m: any) => m.getText()) || []
        };

        entities.push({
            entityId,
            entityData: classEntityData,
            sourceLocation: this.getSourceLocation(cls)
        });

        relations.push({
            relationId: `contains-${generateUniqueIdentifier()}`,
            sourceEntityId: fileEntityId,
            targetEntityId: entityId,
            relationData: { type: CodeRelationType.CONTAINS }
        });

        if (extendsClause) {
            const parentName = extendsClause.getExpression().getText();
            relations.push({
                relationId: `extends-${generateUniqueIdentifier()}`,
                sourceEntityId: entityId,
                targetEntityId: parentName,
                relationData: { type: CodeRelationType.EXTENDS }
            });
        }

        for (const implClause of implementsClauses) {
            const interfaceName = implClause.getExpression().getText();
            relations.push({
                relationId: `implements-${generateUniqueIdentifier()}`,
                sourceEntityId: entityId,
                targetEntityId: interfaceName,
                relationData: { type: CodeRelationType.IMPLEMENTS }
            });
        }

        const methods = cls.getMethods();
        for (const method of methods) {
            this.parseMethod(method, entityId, entities, relations);
        }
    }

    /**
     * 解析方法声明
     */
    private parseMethod(method: any, classEntityId: string, entities: any[], relations: any[]) {
        const methodName = method.getName();
        const entityId = `method-${classEntityId}-${methodName}-${generateUniqueIdentifier()}`;

        const parameters = method.getParameters().map((param: any) => ({
            name: param.getName(),
            typeAnnotation: param.getTypeNode()?.getText(),
            defaultValue: param.getInitializer()?.getText(),
            isOptional: param.isOptional(),
            isRestParameter: param.isRestParameter()
        }));

        const methodEntityData = {
            type: CodeEntityType.METHOD,
            functionName: methodName,
            isAsyncFunction: method.isAsync(),
            isExported: false,
            isDefaultExport: false,
            isGeneratorFunction: method.isGenerator(),
            parameters,
            returnTypeAnnotation: method.getReturnTypeNode()?.getText(),
            accessModifiers: method.getModifiers()?.map((m: any) => m.getText()) || []
        };

        entities.push({
            entityId,
            entityData: methodEntityData,
            sourceLocation: this.getSourceLocation(method)
        });

        relations.push({
            relationId: `contains-${generateUniqueIdentifier()}`,
            sourceEntityId: classEntityId,
            targetEntityId: entityId,
            relationData: { type: CodeRelationType.CONTAINS }
        });

        this.parseFunctionCalls(method, entityId, relations);
    }

    /**
     * 解析函数声明
     */
    private parseFunction(fn: any, fileEntityId: string, entities: any[], relations: any[]) {
        const functionName = fn.getName() || 'anonymousFunction';
        const entityId = `function-${fileEntityId}-${functionName}-${generateUniqueIdentifier()}`;

        const parameters = fn.getParameters().map((param: any) => ({
            name: param.getName(),
            typeAnnotation: param.getTypeNode()?.getText(),
            defaultValue: param.getInitializer()?.getText(),
            isOptional: param.isOptional(),
            isRestParameter: param.isRestParameter()
        }));

        const functionEntityData = {
            type: CodeEntityType.FUNCTION,
            functionName,
            isAsyncFunction: fn.isAsync(),
            isExported: fn.isExported(),
            isDefaultExport: fn.isDefaultExport(),
            isGeneratorFunction: fn.isGenerator(),
            parameters,
            returnTypeAnnotation: fn.getReturnTypeNode()?.getText(),
            accessModifiers: fn.getModifiers()?.map((m: any) => m.getText()) || []
        };

        entities.push({
            entityId,
            entityData: functionEntityData,
            sourceLocation: this.getSourceLocation(fn)
        });

        relations.push({
            relationId: `contains-${generateUniqueIdentifier()}`,
            sourceEntityId: fileEntityId,
            targetEntityId: entityId,
            relationData: { type: CodeRelationType.CONTAINS }
        });

        this.parseFunctionCalls(fn, entityId, relations);
    }

    /**
     * 解析函数调用
     */
    private parseFunctionCalls(node: any, parentEntityId: string, relations: any[]) {
        const callExpressions = node.getDescendantsOfKind(SyntaxKind.CallExpression);
        for (const call of callExpressions) {
            try {
                const expression = call.getExpression();
                const calleeName = expression.getText();
                const startPos = call.getStart();

                relations.push({
                    relationId: `calls-${generateUniqueIdentifier()}`,
                    sourceEntityId: parentEntityId,
                    targetEntityId: calleeName,
                    relationData: {
                        type: CodeRelationType.CALLS,
                        callLineNumber: call.getStartLineNumber(),
                        callColumnNumber: startPos
                    }
                });
            }
            catch {
                // Ignore calls that cannot be parsed
            }
        }
    }

    /**
     * 解析接口声明
     */
    private parseInterface(iface: any, fileEntityId: string, entities: any[], relations: any[]) {
        const interfaceName = iface.getName();
        const entityId = `interface-${fileEntityId}-${interfaceName}-${generateUniqueIdentifier()}`;

        const interfaceEntityData = {
            type: CodeEntityType.INTERFACE,
            interfaceName,
            isExported: iface.isExported(),
            isDefaultExport: iface.isDefaultExport()
        };

        entities.push({
            entityId,
            entityData: interfaceEntityData,
            sourceLocation: this.getSourceLocation(iface)
        });

        relations.push({
            relationId: `contains-${generateUniqueIdentifier()}`,
            sourceEntityId: fileEntityId,
            targetEntityId: entityId,
            relationData: { type: CodeRelationType.CONTAINS }
        });

        const extendsClauses = iface.getExtends();
        for (const extendsClause of extendsClauses) {
            const parentName = extendsClause.getExpression().getText();
            relations.push({
                relationId: `extends-${generateUniqueIdentifier()}`,
                sourceEntityId: entityId,
                targetEntityId: parentName,
                relationData: { type: CodeRelationType.EXTENDS }
            });
        }
    }

    /**
     * 解析枚举声明
     */
    private parseEnum(enm: any, fileEntityId: string, entities: any[], relations: any[]) {
        const enumName = enm.getName();
        const entityId = `enum-${fileEntityId}-${enumName}-${generateUniqueIdentifier()}`;

        const enumEntityData = {
            type: CodeEntityType.ENUM,
            enumName,
            isExported: enm.isExported(),
            isDefaultExport: enm.isDefaultExport(),
            enumMemberNames: enm.getMembers().map((m: any) => m.getName())
        };

        entities.push({
            entityId,
            entityData: enumEntityData,
            sourceLocation: this.getSourceLocation(enm)
        });

        relations.push({
            relationId: `contains-${generateUniqueIdentifier()}`,
            sourceEntityId: fileEntityId,
            targetEntityId: entityId,
            relationData: { type: CodeRelationType.CONTAINS }
        });
    }

    /**
     * 解析变量声明
     */
    private parseVariable(variable: any, fileEntityId: string, entities: any[], relations: any[]) {
        const variableName = variable.getName();
        const entityId = `variable-${fileEntityId}-${variableName}-${generateUniqueIdentifier()}`;
        const declarationList = variable.getParentOrThrow();
        const declarationKind = declarationList.getDeclarationKind();

        const variableEntityData = {
            type: CodeEntityType.VARIABLE,
            variableName,
            variableTypeAnnotation: variable.getTypeNode()?.getText(),
            isConstDeclaration: declarationKind === 'const',
            isLetDeclaration: declarationKind === 'let',
            isExported: false,
            isDefaultExport: false,
            initialValueExpression: variable.getInitializer()?.getText()
        };

        entities.push({
            entityId,
            entityData: variableEntityData,
            sourceLocation: this.getSourceLocation(variable)
        });

        relations.push({
            relationId: `contains-${generateUniqueIdentifier()}`,
            sourceEntityId: fileEntityId,
            targetEntityId: entityId,
            relationData: { type: CodeRelationType.CONTAINS }
        });
    }

    /**
     * 解析导入语句
     */
    private parseImports(sourceFile: any, fileEntityId: string, relations: any[]) {
        const imports = sourceFile.getImportDeclarations();
        for (const imp of imports) {
            const moduleSpecifier = imp.getModuleSpecifier().getText().replace(/['"]/g, '');
            const importedBindings = imp.getNamedImports();
            const defaultImport = imp.getDefaultImport();

            if (defaultImport) {
                const importName = defaultImport.getText();
                relations.push({
                    relationId: `imports-${generateUniqueIdentifier()}`,
                    sourceEntityId: fileEntityId,
                    targetEntityId: moduleSpecifier,
                    relationData: {
                        type: CodeRelationType.IMPORTS,
                        importedNames: [importName],
                        isDefaultImport: true,
                        isNamespaceImport: false
                    }
                });
            }

            for (const binding of importedBindings) {
                const name = binding.getName();
                relations.push({
                    relationId: `imports-${generateUniqueIdentifier()}`,
                    sourceEntityId: fileEntityId,
                    targetEntityId: moduleSpecifier,
                    relationData: {
                        type: CodeRelationType.IMPORTS,
                        importedNames: [name],
                        isDefaultImport: false,
                        isNamespaceImport: false
                    }
                });
            }
        }
    }

    /**
     * 获取源代码位置
     */
    private getSourceLocation(node: any) {
        try {
            const lineNumber = node.getStartLineNumber();
            const columnNumber = node.getStartColumnNumber();
            return {
                line: lineNumber,
                column: columnNumber,
                endLine: node.getEndLineNumber?.() || lineNumber,
                endColumn: node.getEndColumnNumber?.() || columnNumber
            };
        }
        catch {
            return undefined;
        }
    }
}
