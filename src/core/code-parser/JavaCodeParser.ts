import * as fs from 'fs';
import { CodeEntityType, CodeRelationType, CodeParsingResult } from '../../shared/index.js';
import { applicationLogger } from '../../infrastructure/logger/index.js';
import { generateUniqueIdentifier, hashStringContent, extractFileNameAndExtension } from '../../shared/utilities.js';

export class JavaCodeParser {
    parseFile(filePath: string): CodeParsingResult {
        applicationLogger.debug(`Parsing Java file: ${filePath}`);
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

        this.parsePackageDeclaration(fileContent, fileEntityId, relations);
        this.parseImports(fileContent, fileEntityId, relations);
        this.parseClasses(fileContent, fileEntityId, entities, relations);
        this.parseInterfaces(fileContent, fileEntityId, entities, relations);
        this.parseEnums(fileContent, fileEntityId, entities, relations);

        return { codeEntities: entities, codeRelations: relations };
    }

    private parsePackageDeclaration(content: string, fileEntityId: string, relations: any[]) {
        const packageMatch = content.match(/^package\s+([\w.]+);/m);
        if (packageMatch) {
            const packageName = packageMatch[1];
            relations.push({
                relationId: `package-${generateUniqueIdentifier()}`,
                sourceEntityId: fileEntityId,
                targetEntityId: packageName,
                relationData: { type: CodeRelationType.IMPORTS, importedNames: [packageName], isDefaultImport: false, isNamespaceImport: false }
            });
        }
    }

    private parseImports(content: string, fileEntityId: string, relations: any[]) {
        const importRegex = /import\s+(static\s+)?([\w.]+(?:\.\*)?);/gm;
        let match;
        while ((match = importRegex.exec(content)) !== null) {
            const isStatic = match[1] !== undefined;
            const moduleSpecifier = match[2];
            relations.push({
                relationId: `imports-${generateUniqueIdentifier()}`,
                sourceEntityId: fileEntityId,
                targetEntityId: moduleSpecifier,
                relationData: {
                    type: CodeRelationType.IMPORTS,
                    importedNames: [moduleSpecifier],
                    isDefaultImport: false,
                    isNamespaceImport: moduleSpecifier.endsWith('.*')
                }
            });
        }
    }

    private parseClasses(content: string, fileEntityId: string, entities: any[], relations: any[]) {
        const classRegex = /(abstract\s+)?(final\s+)?(public\s+|private\s+|protected\s+)?class\s+(\w+)(\s+extends\s+(\w+))?(\s+implements\s+([\w, ]+))?/g;
        let match;
        while ((match = classRegex.exec(content)) !== null) {
            const isAbstract = match[1] !== undefined;
            const isFinal = match[2] !== undefined;
            const accessModifier = match[3]?.trim() || '';
            const className = match[4];
            const parentClass = match[6];
            const interfaces = match[8]?.split(',').map((s: string) => s.trim()).filter(Boolean) || [];

            const entityId = `class-${fileEntityId}-${className}-${generateUniqueIdentifier()}`;
            const classEntityData = {
                type: CodeEntityType.CLASS,
                className,
                isAbstract,
                isExported: accessModifier === 'public',
                isDefaultExport: accessModifier === 'public',
                accessModifiers: [accessModifier, isAbstract ? 'abstract' : '', isFinal ? 'final' : ''].filter(Boolean)
            };

            entities.push({
                entityId,
                entityData: classEntityData,
                sourceLocation: this.extractLocation(content, match.index)
            });

            relations.push({
                relationId: `contains-${generateUniqueIdentifier()}`,
                sourceEntityId: fileEntityId,
                targetEntityId: entityId,
                relationData: { type: CodeRelationType.CONTAINS }
            });

            if (parentClass) {
                relations.push({
                    relationId: `extends-${generateUniqueIdentifier()}`,
                    sourceEntityId: entityId,
                    targetEntityId: parentClass,
                    relationData: { type: CodeRelationType.EXTENDS }
                });
            }

            for (const iface of interfaces) {
                relations.push({
                    relationId: `implements-${generateUniqueIdentifier()}`,
                    sourceEntityId: entityId,
                    targetEntityId: iface,
                    relationData: { type: CodeRelationType.IMPLEMENTS }
                });
            }

            this.parseMethodsInClass(content, match.index, entityId, entities, relations);
        }
    }

    private parseInterfaces(content: string, fileEntityId: string, entities: any[], relations: any[]) {
        const interfaceRegex = /(public\s+|private\s+|protected\s+)?interface\s+(\w+)(\s+extends\s+([\w, ]+))?/g;
        let match;
        while ((match = interfaceRegex.exec(content)) !== null) {
            const accessModifier = match[1]?.trim() || '';
            const interfaceName = match[2];
            const parentInterfaces = match[4]?.split(',').map((s: string) => s.trim()).filter(Boolean) || [];

            const entityId = `interface-${fileEntityId}-${interfaceName}-${generateUniqueIdentifier()}`;
            const interfaceEntityData = {
                type: CodeEntityType.INTERFACE,
                interfaceName,
                isExported: accessModifier === 'public',
                isDefaultExport: accessModifier === 'public'
            };

            entities.push({
                entityId,
                entityData: interfaceEntityData,
                sourceLocation: this.extractLocation(content, match.index)
            });

            relations.push({
                relationId: `contains-${generateUniqueIdentifier()}`,
                sourceEntityId: fileEntityId,
                targetEntityId: entityId,
                relationData: { type: CodeRelationType.CONTAINS }
            });

            for (const parent of parentInterfaces) {
                relations.push({
                    relationId: `extends-${generateUniqueIdentifier()}`,
                    sourceEntityId: entityId,
                    targetEntityId: parent,
                    relationData: { type: CodeRelationType.EXTENDS }
                });
            }
        }
    }

    private parseEnums(content: string, fileEntityId: string, entities: any[], relations: any[]) {
        const enumRegex = /(public\s+|private\s+|protected\s+)?enum\s+(\w+)(\s+implements\s+([\w, ]+))?\s*\{/g;
        let match;
        while ((match = enumRegex.exec(content)) !== null) {
            const accessModifier = match[1]?.trim() || '';
            const enumName = match[2];

            const entityId = `enum-${fileEntityId}-${enumName}-${generateUniqueIdentifier()}`;
            const enumEntityData = {
                type: CodeEntityType.ENUM,
                enumName,
                isExported: accessModifier === 'public',
                isDefaultExport: accessModifier === 'public',
                enumMemberNames: this.extractEnumMembers(content, match.index)
            };

            entities.push({
                entityId,
                entityData: enumEntityData,
                sourceLocation: this.extractLocation(content, match.index)
            });

            relations.push({
                relationId: `contains-${generateUniqueIdentifier()}`,
                sourceEntityId: fileEntityId,
                targetEntityId: entityId,
                relationData: { type: CodeRelationType.CONTAINS }
            });
        }
    }

    private parseMethodsInClass(content: string, classStartIndex: number, classEntityId: string, entities: any[], relations: any[]) {
        const methodRegex = /(public\s+|private\s+|protected\s+|static\s+|final\s+|abstract\s+|native\s+|synchronized\s+|transient\s+|volatile\s+)*([\w<>\[\]]+)\s+(\w+)\s*\(/g;
        let match;
        while ((match = methodRegex.exec(content)) !== null) {
            if (match.index > classStartIndex) {
                const modifiers = match[1]?.trim().split(/\s+/).filter(Boolean) || [];
                const returnType = match[2];
                const methodName = match[3];

                const isAsync = modifiers.includes('async');
                const isStatic = modifiers.includes('static');
                const isPublic = modifiers.includes('public');

                const entityId = `method-${classEntityId}-${methodName}-${generateUniqueIdentifier()}`;
                const methodEntityData = {
                    type: CodeEntityType.METHOD,
                    functionName: methodName,
                    isAsyncFunction: isAsync,
                    isExported: isPublic,
                    isDefaultExport: false,
                    isGeneratorFunction: false,
                    parameters: this.extractMethodParameters(content, match.index),
                    returnTypeAnnotation: returnType,
                    accessModifiers: modifiers
                };

                entities.push({
                    entityId,
                    entityData: methodEntityData,
                    sourceLocation: this.extractLocation(content, match.index)
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

    private extractMethodParameters(content: string, methodStartIndex: number): any[] {
        const params: any[] = [];
        const parenStart = content.indexOf('(', methodStartIndex);
        const parenEnd = this.findMatchingParen(content, parenStart);
        if (parenStart !== -1 && parenEnd !== -1) {
            const paramsStr = content.substring(parenStart + 1, parenEnd);
            const paramParts = paramsStr.split(',').map(p => p.trim()).filter(Boolean);
            for (const param of paramParts) {
                const parts = param.split(/\s+/);
                if (parts.length >= 2) {
                    const typeAnnotation = parts.slice(0, -1).join(' ');
                    const name = parts[parts.length - 1];
                    params.push({
                        name,
                        typeAnnotation,
                        defaultValue: undefined,
                        isOptional: false,
                        isRestParameter: false
                    });
                }
            }
        }
        return params;
    }

    private extractEnumMembers(content: string, enumStartIndex: number): string[] {
        const braceStart = content.indexOf('{', enumStartIndex);
        const braceEnd = this.findMatchingBrace(content, braceStart);
        if (braceStart !== -1 && braceEnd !== -1) {
            const membersStr = content.substring(braceStart + 1, braceEnd);
            return membersStr.split(',').map(m => m.trim()).filter(m => m && !m.includes('=') && !m.includes('{') && !m.includes(';')).slice(0, 100);
        }
        return [];
    }

    private findMatchingParen(content: string, startIndex: number): number {
        let depth = 1;
        for (let i = startIndex + 1; i < content.length; i++) {
            if (content[i] === '(') depth++;
            if (content[i] === ')') depth--;
            if (depth === 0) return i;
        }
        return -1;
    }

    private findMatchingBrace(content: string, startIndex: number): number {
        let depth = 1;
        for (let i = startIndex + 1; i < content.length; i++) {
            if (content[i] === '{') depth++;
            if (content[i] === '}') depth--;
            if (depth === 0) return i;
        }
        return -1;
    }

    private extractLocation(content: string, index: number): { line: number; column: number; endLine?: number; endColumn?: number } {
        const lines = content.substring(0, index).split('\n');
        const line = lines.length;
        const column = lines[lines.length - 1].length + 1;
        return { line, column };
    }
}