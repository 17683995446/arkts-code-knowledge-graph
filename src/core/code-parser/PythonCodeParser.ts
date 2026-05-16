import * as fs from 'fs';
import * as path from 'path';
import { CodeEntityType, CodeRelationType, CodeParsingResult } from '../../shared/index.js';
import { applicationLogger } from '../../infrastructure/logger/index.js';
import { generateUniqueIdentifier, hashStringContent, extractFileNameAndExtension } from '../../shared/utilities.js';

export class PythonCodeParser {
    parseFile(filePath: string): CodeParsingResult {
        applicationLogger.debug(`Parsing Python file: ${filePath}`);
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const entities: CodeParsingResult['codeEntities'] = [];
        const relations: CodeParsingResult['codeRelations'] = [];

        const { fileName, fileExtension } = extractFileNameAndExtension(filePath);
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

        const fileEntityId = `file-${filePath}`;
        entities.push({
            entityId: fileEntityId,
            entityData: fileEntityData,
            sourceLocation: {
                filePath,
                line: 1,
                column: 1,
                endLine: linesOfCode,
                endColumn: 1
            }
        });

        this.parseImports(fileContent, fileEntityId, relations);
        this.parseClasses(fileContent, fileEntityId, entities, relations);
        this.parseFunctions(fileContent, fileEntityId, entities, relations);
        this.parseVariables(fileContent, fileEntityId, entities, relations);

        return { codeEntities: entities, codeRelations: relations };
    }

    parseDirectory(directoryPath: string): CodeParsingResult {
        applicationLogger.debug(`Parsing Python directory: ${directoryPath}`);
        const allEntities: CodeParsingResult['codeEntities'] = [];
        const allRelations: CodeParsingResult['codeRelations'] = [];

        const pyFiles = this.findPythonFiles(directoryPath);
        for (const pyFile of pyFiles) {
            const result = this.parseFile(pyFile);
            allEntities.push(...result.codeEntities);
            allRelations.push(...result.codeRelations);
        }

        return { codeEntities: allEntities, codeRelations: allRelations };
    }

    private findPythonFiles(directoryPath: string): string[] {
        const files: string[] = [];
        const items = fs.readdirSync(directoryPath);
        
        for (const item of items) {
            const fullPath = path.join(directoryPath, item);
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory() && !item.startsWith('.') && item !== '__pycache__') {
                files.push(...this.findPythonFiles(fullPath));
            } else if (stat.isFile() && item.endsWith('.py')) {
                files.push(fullPath);
            }
        }
        
        return files;
    }

    private parseImports(content: string, fileEntityId: string, relations: any[]) {
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const importMatch = line.match(/^import\s+(\w+(\.\w+)*)(\s+as\s+\w+)?/);
            if (importMatch) {
                const moduleSpecifier = importMatch[1];
                relations.push({
                    relationId: `imports-${generateUniqueIdentifier()}`,
                    sourceEntityId: fileEntityId,
                    targetEntityId: moduleSpecifier,
                    relationData: {
                        type: CodeRelationType.IMPORTS,
                        importedNames: [moduleSpecifier],
                        isDefaultImport: false,
                        isNamespaceImport: false
                    }
                });
                continue;
            }

            const fromMatch = line.match(/^from\s+(\w+(\.\w+)*)\s+import\s+(\*|(\w+(\s*,\s*\w+)*))/);
            if (fromMatch) {
                const moduleSpecifier = fromMatch[1];
                const importedNames = fromMatch[3] === '*' 
                    ? ['*'] 
                    : fromMatch[3].split(',').map((s: string) => s.trim()).filter(Boolean);
                
                relations.push({
                    relationId: `imports-${generateUniqueIdentifier()}`,
                    sourceEntityId: fileEntityId,
                    targetEntityId: moduleSpecifier,
                    relationData: {
                        type: CodeRelationType.IMPORTS,
                        importedNames,
                        isDefaultImport: false,
                        isNamespaceImport: fromMatch[3] === '*'
                    }
                });
            }
        }
    }

    private parseClasses(content: string, fileEntityId: string, entities: any[], relations: any[]) {
        const lines = content.split('\n');
        let inClass = false;
        let className = '';
        let currentLine = 0;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const classMatch = line.match(/^\s*(class)\s+(\w+)(\s*\(\s*([\w, .]+)\s*\))?\s*:/);
            
            if (classMatch) {
                const isAbstract = line.includes('abc.ABC') || line.includes('abstractmethod');
                const bases = classMatch[4]?.split(',').map((s: string) => s.trim()).filter(Boolean) || [];
                
                className = classMatch[2];
                const entityId = `class-${fileEntityId}-${className}-${generateUniqueIdentifier()}`;
                
                const classEntityData = {
                    type: CodeEntityType.CLASS,
                    className,
                    isAbstract,
                    isExported: !className.startsWith('_'),
                    isDefaultExport: className === 'main' || !className.startsWith('_'),
                    accessModifiers: className.startsWith('_') ? ['private'] : ['public']
                };

                entities.push({
                    entityId,
                    entityData: classEntityData,
                    sourceLocation: {
                        line: i + 1,
                        column: line.indexOf('class') + 1,
                        filePath: fileEntityId.replace('file-', '')
                    }
                });

                relations.push({
                    relationId: `contains-${generateUniqueIdentifier()}`,
                    sourceEntityId: fileEntityId,
                    targetEntityId: entityId,
                    relationData: { type: CodeRelationType.CONTAINS }
                });

                for (const base of bases) {
                    if (base && !['object', 'ABC'].includes(base)) {
                        relations.push({
                            relationId: `extends-${generateUniqueIdentifier()}`,
                            sourceEntityId: entityId,
                            targetEntityId: base,
                            relationData: { type: CodeRelationType.EXTENDS }
                        });
                    }
                }

                inClass = true;
                currentLine = i;
                
                this.parseMethodsInClass(lines, i + 1, entityId, entities, relations);
            }
        }
    }

    private parseMethodsInClass(lines: string[], startLine: number, classEntityId: string, entities: any[], relations: any[]) {
        let currentIndent = 0;
        for (let i = startLine; i < lines.length; i++) {
            const line = lines[i];
            const stripped = line.trim();
            
            if (!stripped || stripped.startsWith('#')) continue;
            
            const indent = line.search(/\S/);
            if (indent <= currentIndent && currentIndent > 0) {
                break;
            }
            
            if (currentIndent === 0) {
                currentIndent = indent;
            }
            
            if (indent > currentIndent) {
                const methodMatch = stripped.match(/^def\s+(\w+)\s*\(/);
                if (methodMatch) {
                    const methodName = methodMatch[1];
                    const entityId = `method-${classEntityId}-${methodName}-${generateUniqueIdentifier()}`;
                    
                    const methodEntityData = {
                        type: CodeEntityType.METHOD,
                        functionName: methodName,
                        isAsyncFunction: stripped.startsWith('async def'),
                        isExported: !methodName.startsWith('_'),
                        isDefaultExport: false,
                        isGeneratorFunction: stripped.includes('yield'),
                        parameters: this.extractMethodParameters(stripped),
                        returnTypeAnnotation: this.extractReturnType(line, lines, i),
                        accessModifiers: methodName.startsWith('_') ? ['private'] : ['public']
                    };

                    entities.push({
                        entityId,
                        entityData: methodEntityData,
                        sourceLocation: {
                            line: i + 1,
                            column: indent + 1,
                            filePath: classEntityId.replace('class-file-', '')
                        }
                    });

                    relations.push({
                        relationId: `contains-${generateUniqueIdentifier()}`,
                        sourceEntityId: classEntityId,
                        targetEntityId: entityId,
                        relationData: { type: CodeRelationType.CONTAINS }
                    });
                }
            }
        }
    }

    private parseFunctions(content: string, fileEntityId: string, entities: any[], relations: any[]) {
        const lines = content.split('\n');
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const stripped = line.trim();
            
            if (!stripped.startsWith('def ') && !stripped.startsWith('async def ')) continue;
            
            const indent = line.search(/\S/);
            if (indent > 0) continue;
            
            const funcMatch = stripped.match(/^(async\s+)?def\s+(\w+)\s*\(/);
            if (funcMatch) {
                const isAsync = funcMatch[1] !== undefined;
                const functionName = funcMatch[2];
                
                const entityId = `function-${fileEntityId}-${functionName}-${generateUniqueIdentifier()}`;
                const functionEntityData = {
                    type: CodeEntityType.FUNCTION,
                    functionName,
                    isAsyncFunction: isAsync,
                    isExported: !functionName.startsWith('_'),
                    isDefaultExport: functionName === 'main',
                    isGeneratorFunction: this.hasYieldInFunction(lines, i),
                    parameters: this.extractMethodParameters(stripped),
                    returnTypeAnnotation: this.extractReturnType(line, lines, i),
                    accessModifiers: functionName.startsWith('_') ? ['private'] : ['public']
                };

                entities.push({
                    entityId,
                    entityData: functionEntityData,
                    sourceLocation: {
                        line: i + 1,
                        column: 1,
                        filePath: fileEntityId.replace('file-', '')
                    }
                });

                relations.push({
                    relationId: `contains-${generateUniqueIdentifier()}`,
                    sourceEntityId: fileEntityId,
                    targetEntityId: entityId,
                    relationData: { type: CodeRelationType.CONTAINS }
                });
            }
        }
    }

    private parseVariables(content: string, fileEntityId: string, entities: any[], relations: any[]) {
        const lines = content.split('\n');
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const stripped = line.trim();
            
            if (!stripped || stripped.startsWith('#') || stripped.startsWith('def ') || stripped.startsWith('class ')) continue;
            
            const varMatch = stripped.match(/^(\w+)\s*=\s*.+/);
            if (varMatch) {
                const variableName = varMatch[1];
                if (variableName.match(/^[a-zA-Z_][a-zA-Z0-9_]*$/)) {
                    const entityId = `variable-${fileEntityId}-${variableName}-${generateUniqueIdentifier()}`;
                    const variableEntityData = {
                        type: CodeEntityType.VARIABLE,
                        variableName,
                        variableTypeAnnotation: undefined,
                        isConstDeclaration: variableName === variableName.toUpperCase(),
                        isLetDeclaration: !variableName.startsWith('_'),
                        isExported: !variableName.startsWith('_'),
                        isDefaultExport: false,
                        initialValueExpression: stripped.substring(stripped.indexOf('=') + 1).trim()
                    };

                    entities.push({
                        entityId,
                        entityData: variableEntityData,
                        sourceLocation: {
                            line: i + 1,
                            column: line.indexOf(variableName) + 1,
                            filePath: fileEntityId.replace('file-', '')
                        }
                    });

                    relations.push({
                        relationId: `contains-${generateUniqueIdentifier()}`,
                        sourceEntityId: fileEntityId,
                        targetEntityId: entityId,
                        relationData: { type: CodeRelationType.CONTAINS }
                    });
                }
            }
        }
    }

    private extractMethodParameters(line: string): any[] {
        const params: any[] = [];
        const parenStart = line.indexOf('(');
        const parenEnd = line.indexOf(')');
        
        if (parenStart !== -1 && parenEnd !== -1) {
            const paramsStr = line.substring(parenStart + 1, parenEnd);
            const paramParts = paramsStr.split(',').map(p => p.trim()).filter(Boolean);
            
            for (const param of paramParts) {
                const parts = param.split('=');
                const namePart = parts[0].trim();
                const hasDefault = parts.length > 1;
                const defaultValue = hasDefault ? parts.slice(1).join('=').trim() : undefined;
                
                const isOptional = hasDefault || namePart.endsWith('?');
                const isRestParameter = namePart.startsWith('*');
                
                params.push({
                    name: isRestParameter ? namePart.substring(1) : namePart.replace('?', ''),
                    typeAnnotation: undefined,
                    defaultValue,
                    isOptional,
                    isRestParameter
                });
            }
        }
        
        return params;
    }

    private extractReturnType(line: string, lines: string[], currentLine: number): string | undefined {
        const returnTypeMatch = line.match(/->\s*(\w+(\.\w+)?)/);
        if (returnTypeMatch) {
            return returnTypeMatch[1];
        }
        
        return undefined;
    }

    private hasYieldInFunction(lines: string[], startLine: number): boolean {
        let depth = 1;
        
        for (let i = startLine + 1; i < lines.length; i++) {
            const line = lines[i];
            const stripped = line.trim();
            
            if (stripped.startsWith('def ') || stripped.startsWith('class ')) {
                depth++;
            }
            
            if (stripped === 'return' || depth === 0) {
                break;
            }
            
            if (stripped.includes('yield')) {
                return true;
            }
        }
        
        return false;
    }
}