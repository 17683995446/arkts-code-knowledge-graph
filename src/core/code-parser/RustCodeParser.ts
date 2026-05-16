import * as fs from 'fs';
import * as path from 'path';
import { CodeEntityType, CodeRelationType, CodeParsingResult } from '../../shared/index.js';
import { applicationLogger } from '../../infrastructure/logger/index.js';
import { generateUniqueIdentifier, hashStringContent, extractFileNameAndExtension } from '../../shared/utilities.js';

export class RustCodeParser {
    parseFile(filePath: string): CodeParsingResult {
        applicationLogger.debug(`Parsing Rust file: ${filePath}`);
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

        this.parseModules(fileContent, fileEntityId, relations);
        this.parseImports(fileContent, fileEntityId, relations);
        this.parseStructs(fileContent, fileEntityId, entities, relations);
        this.parseEnums(fileContent, fileEntityId, entities, relations);
        this.parseFunctions(fileContent, fileEntityId, entities, relations);
        this.parseTraits(fileContent, fileEntityId, entities, relations);

        return { codeEntities: entities, codeRelations: relations };
    }

    parseDirectory(directoryPath: string): CodeParsingResult {
        applicationLogger.debug(`Parsing Rust directory: ${directoryPath}`);
        const allEntities: CodeParsingResult['codeEntities'] = [];
        const allRelations: CodeParsingResult['codeRelations'] = [];

        const rsFiles = this.findRustFiles(directoryPath);
        for (const rsFile of rsFiles) {
            const result = this.parseFile(rsFile);
            allEntities.push(...result.codeEntities);
            allRelations.push(...result.codeRelations);
        }

        return { codeEntities: allEntities, codeRelations: allRelations };
    }

    parseCargoProject(projectPath: string): CodeParsingResult {
        applicationLogger.debug(`Parsing Cargo project: ${projectPath}`);
        const cargoTomlPath = path.join(projectPath, 'Cargo.toml');
        
        if (fs.existsSync(cargoTomlPath)) {
            const cargoContent = fs.readFileSync(cargoTomlPath, 'utf-8');
            const projectName = this.extractProjectName(cargoContent);
            applicationLogger.info(`Found Cargo project: ${projectName}`);
        }

        return this.parseDirectory(path.join(projectPath, 'src'));
    }

    private findRustFiles(directoryPath: string): string[] {
        const files: string[] = [];
        const items = fs.readdirSync(directoryPath);
        
        for (const item of items) {
            const fullPath = path.join(directoryPath, item);
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory() && !item.startsWith('.') && item !== 'target') {
                files.push(...this.findRustFiles(fullPath));
            } else if (stat.isFile() && item.endsWith('.rs')) {
                files.push(fullPath);
            }
        }
        
        return files;
    }

    private extractProjectName(cargoContent: string): string {
        const nameMatch = cargoContent.match(/^\[package\]\s*\n.*\nname\s*=\s*["']([^"']+)["']/m);
        return nameMatch ? nameMatch[1] : 'unknown';
    }

    private parseModules(content: string, fileEntityId: string, relations: any[]) {
        const modMatch = content.match(/^mod\s+(\w+)(\s*;|\s*\{)/m);
        if (modMatch) {
            const moduleName = modMatch[1];
            relations.push({
                relationId: `module-${generateUniqueIdentifier()}`,
                sourceEntityId: fileEntityId,
                targetEntityId: moduleName,
                relationData: { type: CodeRelationType.CONTAINS }
            });
        }
    }

    private parseImports(content: string, fileEntityId: string, relations: any[]) {
        const lines = content.split('\n');
        for (const line of lines) {
            const useMatch = line.match(/^use\s+([\w:]+)(\s+as\s+\w+)?\s*;/);
            if (useMatch) {
                const moduleSpecifier = useMatch[1];
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

            const pubUseMatch = line.match(/^pub\s+use\s+([\w:]+)(\s+as\s+\w+)?\s*;/);
            if (pubUseMatch) {
                const moduleSpecifier = pubUseMatch[1];
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
            }
        }
    }

    private parseStructs(content: string, fileEntityId: string, entities: any[], relations: any[]) {
        const structRegex = /(pub\s+)?(struct)\s+(\w+)(\s*<[\w, ]+>)?(\s*:\s*(\w+(\s*\+\s*\w+)*))?\s*\{/g;
        let match;
        while ((match = structRegex.exec(content)) !== null) {
            const isPublic = match[1] !== undefined;
            const structName = match[3];
            const generics = match[4]?.trim();
            const derives = match[6]?.split('+').map((s: string) => s.trim()).filter(Boolean) || [];

            const entityId = `class-${fileEntityId}-${structName}-${generateUniqueIdentifier()}`;
            const structEntityData = {
                type: CodeEntityType.CLASS,
                className: structName,
                isAbstract: false,
                isExported: isPublic,
                isDefaultExport: isPublic,
                accessModifiers: isPublic ? ['pub'] : []
            };

            entities.push({
                entityId,
                entityData: structEntityData,
                sourceLocation: this.extractLocation(content, match.index)
            });

            relations.push({
                relationId: `contains-${generateUniqueIdentifier()}`,
                sourceEntityId: fileEntityId,
                targetEntityId: entityId,
                relationData: { type: CodeRelationType.CONTAINS }
            });

            for (const derive of derives) {
                relations.push({
                    relationId: `implements-${generateUniqueIdentifier()}`,
                    sourceEntityId: entityId,
                    targetEntityId: derive,
                    relationData: { type: CodeRelationType.IMPLEMENTS }
                });
            }

            this.parseStructFields(content, match.index, entityId, entities, relations);
        }
    }

    private parseStructFields(content: string, structStartIndex: number, structEntityId: string, entities: any[], relations: any[]) {
        const braceStart = content.indexOf('{', structStartIndex);
        const braceEnd = this.findMatchingBrace(content, braceStart);
        
        if (braceStart !== -1 && braceEnd !== -1) {
            const fieldsContent = content.substring(braceStart + 1, braceEnd);
            const fieldRegex = /\s*(pub\s+)?(\w+)\s*:\s*([\w:<>\[\]]+)(\s*,\s*)?/g;
            let fieldMatch;
            
            while ((fieldMatch = fieldRegex.exec(fieldsContent)) !== null) {
                const isPublic = fieldMatch[1] !== undefined;
                const fieldName = fieldMatch[2];
                const fieldType = fieldMatch[3];

                const entityId = `property-${structEntityId}-${fieldName}-${generateUniqueIdentifier()}`;
                const fieldEntityData = {
                    type: CodeEntityType.PROPERTY,
                    variableName: fieldName,
                    variableTypeAnnotation: fieldType,
                    isConstDeclaration: false,
                    isLetDeclaration: true,
                    isExported: isPublic,
                    isDefaultExport: false,
                    initialValueExpression: undefined
                };

                entities.push({
                    entityId,
                    entityData: fieldEntityData,
                    sourceLocation: this.extractLocation(fieldsContent, fieldMatch.index)
                });

                relations.push({
                    relationId: `contains-${generateUniqueIdentifier()}`,
                    sourceEntityId: structEntityId,
                    targetEntityId: entityId,
                    relationData: { type: CodeRelationType.CONTAINS }
                });
            }
        }
    }

    private parseEnums(content: string, fileEntityId: string, entities: any[], relations: any[]) {
        const enumRegex = /(pub\s+)?(enum)\s+(\w+)(\s*<[\w, ]+>)?(\s*:\s*(\w+(\s*\+\s*\w+)*))?\s*\{/g;
        let match;
        while ((match = enumRegex.exec(content)) !== null) {
            const isPublic = match[1] !== undefined;
            const enumName = match[3];
            const derives = match[6]?.split('+').map((s: string) => s.trim()).filter(Boolean) || [];

            const entityId = `enum-${fileEntityId}-${enumName}-${generateUniqueIdentifier()}`;
            const enumEntityData = {
                type: CodeEntityType.ENUM,
                enumName,
                isExported: isPublic,
                isDefaultExport: isPublic,
                enumMemberNames: this.extractEnumVariants(content, match.index)
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

    private extractEnumVariants(content: string, enumStartIndex: number): string[] {
        const braceStart = content.indexOf('{', enumStartIndex);
        const braceEnd = this.findMatchingBrace(content, braceStart);
        
        if (braceStart !== -1 && braceEnd !== -1) {
            const variantsContent = content.substring(braceStart + 1, braceEnd);
            const variantRegex = /^\s*(\w+)/gm;
            const variants: string[] = [];
            let variantMatch;
            
            while ((variantMatch = variantRegex.exec(variantsContent)) !== null) {
                variants.push(variantMatch[1]);
            }
            
            return variants.slice(0, 100);
        }
        
        return [];
    }

    private parseFunctions(content: string, fileEntityId: string, entities: any[], relations: any[]) {
        const funcRegex = /(pub\s+)?(async\s+)?(fn)\s+(\w+)(\s*<[\w, ]+>)?\s*\(/g;
        let match;
        while ((match = funcRegex.exec(content)) !== null) {
            const isPublic = match[1] !== undefined;
            const isAsync = match[2] !== undefined;
            const functionName = match[4];
            const generics = match[5]?.trim();

            const entityId = `function-${fileEntityId}-${functionName}-${generateUniqueIdentifier()}`;
            const functionEntityData = {
                type: CodeEntityType.FUNCTION,
                functionName,
                isAsyncFunction: isAsync,
                isExported: isPublic,
                isDefaultExport: isPublic,
                isGeneratorFunction: false,
                parameters: this.extractFunctionParameters(content, match.index),
                returnTypeAnnotation: this.extractReturnType(content, match.index),
                accessModifiers: isPublic ? ['pub'] : []
            };

            entities.push({
                entityId,
                entityData: functionEntityData,
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

    private parseTraits(content: string, fileEntityId: string, entities: any[], relations: any[]) {
        const traitRegex = /(pub\s+)?(trait)\s+(\w+)(\s*<[\w, ]+>)?(\s*:\s*([\w:]+(\s*\+\s*[\w:]+)*))?\s*\{/g;
        let match;
        while ((match = traitRegex.exec(content)) !== null) {
            const isPublic = match[1] !== undefined;
            const traitName = match[3];
            const superTraits = match[6]?.split('+').map((s: string) => s.trim()).filter(Boolean) || [];

            const entityId = `interface-${fileEntityId}-${traitName}-${generateUniqueIdentifier()}`;
            const traitEntityData = {
                type: CodeEntityType.INTERFACE,
                interfaceName: traitName,
                isExported: isPublic,
                isDefaultExport: isPublic
            };

            entities.push({
                entityId,
                entityData: traitEntityData,
                sourceLocation: this.extractLocation(content, match.index)
            });

            relations.push({
                relationId: `contains-${generateUniqueIdentifier()}`,
                sourceEntityId: fileEntityId,
                targetEntityId: entityId,
                relationData: { type: CodeRelationType.CONTAINS }
            });

            for (const superTrait of superTraits) {
                relations.push({
                    relationId: `extends-${generateUniqueIdentifier()}`,
                    sourceEntityId: entityId,
                    targetEntityId: superTrait,
                    relationData: { type: CodeRelationType.EXTENDS }
                });
            }
        }
    }

    private extractFunctionParameters(content: string, funcStartIndex: number): any[] {
        const params: any[] = [];
        const parenStart = content.indexOf('(', funcStartIndex);
        const parenEnd = this.findMatchingParen(content, parenStart);
        
        if (parenStart !== -1 && parenEnd !== -1) {
            const paramsStr = content.substring(parenStart + 1, parenEnd);
            const paramParts = paramsStr.split(',').map(p => p.trim()).filter(Boolean);
            
            for (const param of paramParts) {
                const parts = param.split(':').map(s => s.trim());
                if (parts.length >= 2) {
                    const name = parts[0];
                    const typeAnnotation = parts.slice(1).join(':');
                    
                    params.push({
                        name,
                        typeAnnotation,
                        defaultValue: undefined,
                        isOptional: false,
                        isRestParameter: name.startsWith('...')
                    });
                }
            }
        }
        
        return params;
    }

    private extractReturnType(content: string, funcStartIndex: number): string | undefined {
        const parenEnd = content.indexOf(')', funcStartIndex);
        if (parenEnd === -1) return undefined;
        
        const afterParen = content.substring(parenEnd + 1);
        const arrowMatch = afterParen.match(/^\s*->\s*([\w:<>\[\] ]+)/);
        
        return arrowMatch ? arrowMatch[1].trim() : undefined;
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