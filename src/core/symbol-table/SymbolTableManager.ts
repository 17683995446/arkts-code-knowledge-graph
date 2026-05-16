import { CodeEntityType, SymbolInfo, FileSymbolTable, ProjectSymbolTable, CodeEntityData } from '../../shared/index.js';
import { applicationLogger } from '../../infrastructure/logger/index.js';

/** 符号表管理器 */
export class SymbolTableManager {
    private projectSymbolTable: ProjectSymbolTable;

    constructor() {
        this.projectSymbolTable = {
            fileSymbolTables: new Map(),
            globalSymbolIndex: new Map(),
            allSymbols: [],
        };
    }

    /**
     * 创建文件符号表
     */
    createFileSymbolTable(filePath: string): FileSymbolTable {
        const fileSymbolTable: FileSymbolTable = {
            filePath,
            localSymbols: new Map(),
            exportedSymbols: new Map(),
            importedSymbols: new Map(),
            allSymbols: [],
        };
        this.projectSymbolTable.fileSymbolTables.set(filePath, fileSymbolTable);
        return fileSymbolTable;
    }

    /**
     * 添加符号到文件符号表
     */
    addSymbol(fileSymbolTable: FileSymbolTable, name: string, entityId: string, symbolType: CodeEntityType, entityData: CodeEntityData, _scopePath: string[] = []): SymbolInfo {
        let isExported = false;
        let isDefaultExport = false;
        if ('isExported' in entityData) {
            isExported = entityData.isExported;
        }
        if ('isDefaultExport' in entityData) {
            isDefaultExport = entityData.isDefaultExport;
        }

        const symbolInfo: SymbolInfo = {
            name,
            entityId,
            symbolType,
            filePath: fileSymbolTable.filePath,
            scopePath: [..._scopePath],
            isExported,
            isDefaultExport,
        };

        fileSymbolTable.localSymbols.set(name, symbolInfo);
        fileSymbolTable.allSymbols.push(symbolInfo);
        this.projectSymbolTable.allSymbols.push(symbolInfo);

        const qualifiedName = this.getQualifiedName(fileSymbolTable.filePath, _scopePath, name);
        this.projectSymbolTable.globalSymbolIndex.set(qualifiedName, symbolInfo);

        if (isExported) {
            fileSymbolTable.exportedSymbols.set(name, symbolInfo);
            const globalExportName = this.getExportedName(fileSymbolTable.filePath, name);
            this.projectSymbolTable.globalSymbolIndex.set(globalExportName, symbolInfo);
        }

        if (isDefaultExport) {
            const defaultExportName = this.getDefaultExportName(fileSymbolTable.filePath);
            fileSymbolTable.exportedSymbols.set('default', symbolInfo);
            this.projectSymbolTable.globalSymbolIndex.set(defaultExportName, symbolInfo);
        }

        applicationLogger.debug(`Added symbol: ${name} in ${fileSymbolTable.filePath}`);
        return symbolInfo;
    }

    /**
     * 记录导入符号
     */
    addImportedSymbol(fileSymbolTable: FileSymbolTable, localName: string, modulePath: string, symbolName: string, isDefault: boolean = false): void {
        fileSymbolTable.importedSymbols.set(localName, {
            modulePath,
            symbolName,
            isDefault,
        });
        applicationLogger.debug(`Recorded import: ${localName} from ${modulePath}`);
    }

    /**
     * 查找符号
     */
    findSymbol(name: string, currentFilePath?: string, _scopePath: string[] = []): SymbolInfo | null {
        if (currentFilePath) {
            const fileSymbolTable = this.projectSymbolTable.fileSymbolTables.get(currentFilePath);
            if (fileSymbolTable) {
                const localSymbol = fileSymbolTable.localSymbols.get(name);
                if (localSymbol) {
                    return localSymbol;
                }
                const imported = fileSymbolTable.importedSymbols.get(name);
                if (imported) {
                    return this.findImportedSymbol(imported.modulePath, imported.symbolName, imported.isDefault);
                }
            }
        }

        const globalSymbol = this.projectSymbolTable.globalSymbolIndex.get(name);
        if (globalSymbol) {
            return globalSymbol;
        }

        for (const [filePath, fileTable] of this.projectSymbolTable.fileSymbolTables) {
            const exported = fileTable.exportedSymbols.get(name);
            if (exported) {
                return exported;
            }
            const defaultExport = fileTable.exportedSymbols.get('default');
            if (defaultExport && name === filePath.split('/').pop()?.replace(/\.[^.]+$/, '')) {
                return defaultExport;
            }
        }

        if (this.isBuiltinSymbol(name)) {
            applicationLogger.debug(`Skipping builtin symbol: ${name}`);
            return null;
        }

        return null;
    }

    /**
     * 查找导入符号
     */
    private findImportedSymbol(modulePath: string, symbolName: string, isDefault: boolean): SymbolInfo | null {
        const possibleFilePaths = this.resolveModulePath(modulePath);
        for (const filePath of possibleFilePaths) {
            const fileTable = this.projectSymbolTable.fileSymbolTables.get(filePath);
            if (fileTable) {
                if (isDefault) {
                    const defaultExport = fileTable.exportedSymbols.get('default');
                    if (defaultExport) {
                        return defaultExport;
                    }
                } else {
                    const symbol = fileTable.exportedSymbols.get(symbolName);
                    if (symbol) {
                        return symbol;
                    }
                }
            }
        }
        return null;
    }

    /**
     * 解析模块路径
     */
    private resolveModulePath(modulePath: string): string[] {
        const result: string[] = [];
        const extensions = ['.ts', '.tsx', '.js', '.jsx', '.ets'];
        for (const ext of extensions) {
            result.push(modulePath + ext);
        }
        for (const ext of extensions) {
            result.push(`${modulePath}/index${ext}`);
        }
        return result;
    }

    /**
     * 检查是否是内置符号
     */
    private isBuiltinSymbol(name: string): boolean {
        const builtins = new Set([
            'console', 'Math', 'Date', 'Array', 'Object', 'String', 'Number', 'Boolean',
            'RegExp', 'Error', 'Function', 'Symbol', 'Map', 'Set', 'WeakMap', 'WeakSet',
            'Promise', 'Proxy', 'Reflect',
            'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'eval', 'encodeURI', 'encodeURIComponent',
            'decodeURI', 'decodeURIComponent', 'escape', 'unescape',
            'log', 'info', 'warn', 'error', 'debug',
            'random', 'floor', 'ceil', 'round', 'abs', 'max', 'min', 'sqrt', 'pow',
            'toString', 'toFixed', 'toPrecision',
            'split', 'join', 'trim', 'substring', 'indexOf', 'includes',
            'push', 'pop', 'shift', 'unshift', 'slice', 'splice', 'map', 'filter', 'reduce',
            'new Date', 'new Array', 'new Object', 'new Error',
        ]);

        if (builtins.has(name)) {
            return true;
        }
        if (name.includes('.')) {
            const parts = name.split('.');
            if (parts.length === 2 && builtins.has(parts[0])) {
                return true;
            }
        }
        return false;
    }

    /**
     * 获取完全限定名
     */
    private getQualifiedName(filePath: string, scopePath: string[], name: string): string {
        const parts = [filePath, ...scopePath, name];
        return parts.join('::');
    }

    /**
     * 获取导出名
     */
    private getExportedName(filePath: string, name: string): string {
        return `export:${filePath}:${name}`;
    }

    /**
     * 获取默认导出名
     */
    private getDefaultExportName(filePath: string): string {
        return `export:${filePath}:default`;
    }

    /**
     * 获取项目符号表
     */
    getProjectSymbolTable(): ProjectSymbolTable {
        return this.projectSymbolTable;
    }

    /**
     * 获取文件符号表
     */
    getFileSymbolTable(filePath: string): FileSymbolTable | undefined {
        return this.projectSymbolTable.fileSymbolTables.get(filePath);
    }
}
