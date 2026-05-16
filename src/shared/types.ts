import { z } from 'zod';

export enum CodeEntityType {
  FILE = "File",
  MODULE = "Module",
  CLASS = "Class",
  FUNCTION = "Function",
  VARIABLE = "Variable",
  INTERFACE = "Interface",
  ENUM = "Enum",
  METHOD = "Method",
  PROPERTY = "Property",
  UNKNOWN = "Unknown"
}

export enum CodeRelationType {
  CALLS = "Calls",
  EXTENDS = "Extends",
  IMPLEMENTS = "Implements",
  REFERENCES = "References",
  IMPORTS = "Imports",
  EXPORTS = "Exports",
  DEPENDS_ON = "DependsOn",
  CONTAINS = "Contains",
  INSTANTIATES = "Instantiates"
}

export interface SourceCodeLocation {
  line: number;
  column: number;
  endLine?: number;
  endColumn?: number;
  filePath?: string;
}

export interface FunctionParameterInfo {
  name: string;
  typeAnnotation?: string;
  defaultValue?: string;
  isOptional: boolean;
  isRestParameter: boolean;
}

export interface FileCodeEntityData {
  type: CodeEntityType.FILE;
  filePath: string;
  fileName: string;
  fileExtension: string;
  linesOfCode: number;
  lastModifiedTimestamp: number;
  contentHash: string;
}

export interface ClassCodeEntityData {
  type: CodeEntityType.CLASS;
  className: string;
  isAbstract: boolean;
  isExported: boolean;
  isDefaultExport: boolean;
  accessModifiers: string[];
}

export interface FunctionCodeEntityData {
  type: CodeEntityType.FUNCTION | CodeEntityType.METHOD;
  functionName: string;
  isAsyncFunction: boolean;
  isExported: boolean;
  isDefaultExport: boolean;
  isGeneratorFunction: boolean;
  parameters: FunctionParameterInfo[];
  returnTypeAnnotation?: string;
  accessModifiers: string[];
}

export interface VariableCodeEntityData {
  type: CodeEntityType.VARIABLE | CodeEntityType.PROPERTY;
  variableName: string;
  variableTypeAnnotation?: string;
  isConstDeclaration: boolean;
  isLetDeclaration: boolean;
  isExported: boolean;
  isDefaultExport: boolean;
  initialValueExpression?: string;
}

export interface InterfaceCodeEntityData {
  type: CodeEntityType.INTERFACE;
  interfaceName: string;
  isExported: boolean;
  isDefaultExport: boolean;
}

export interface EnumCodeEntityData {
  type: CodeEntityType.ENUM;
  enumName: string;
  isExported: boolean;
  isDefaultExport: boolean;
  enumMemberNames: string[];
}

export interface UnknownCodeEntityData {
  type: CodeEntityType.UNKNOWN;
  entityName: string;
}

export type CodeEntityData = FileCodeEntityData | ClassCodeEntityData | FunctionCodeEntityData | VariableCodeEntityData | InterfaceCodeEntityData | EnumCodeEntityData | UnknownCodeEntityData;

export interface CallsRelationData {
  type: CodeRelationType.CALLS;
  callLineNumber?: number;
  callColumnNumber?: number;
}

export interface ExtendsRelationData {
  type: CodeRelationType.EXTENDS;
}

export interface ImplementsRelationData {
  type: CodeRelationType.IMPLEMENTS;
}

export interface ReferencesRelationData {
  type: CodeRelationType.REFERENCES;
  referenceLineNumber?: number;
  referenceColumnNumber?: number;
  referenceType: 'read' | 'write' | 'call';
}

export interface ImportsRelationData {
  type: CodeRelationType.IMPORTS;
  importedNames?: string[];
  isDefaultImport: boolean;
  isNamespaceImport: boolean;
}

export interface ContainsRelationData {
  type: CodeRelationType.CONTAINS;
}

export type CodeRelationData = CallsRelationData | ExtendsRelationData | ImplementsRelationData | ReferencesRelationData | ImportsRelationData | ContainsRelationData;

export interface CodeParsingResult {
  codeEntities: Array<{
    entityId: string;
    entityData: CodeEntityData;
    sourceLocation?: SourceCodeLocation;
  }>;
  codeRelations: Array<{
    relationId: string;
    sourceEntityId: string;
    targetEntityId: string;
    relationData: CodeRelationData;
  }>;
}

export const ConfigurationSchema = z.object({
  parser: z.object({
    include: z.array(z.string()).default(['**/*.{ts,tsx,js,jsx,ets}']),
    exclude: z.array(z.string()).default(['node_modules/**', 'dist/**', 'build/**', '.git/**']),
    maxFileSizeBytes: z.number().int().default(1024 * 1024)
  }).default({}),
  graph: z.object({
    dataDirectory: z.string().default('./.arkts-code-graph'),
    persistToFileSystem: z.boolean().default(true)
  }).default({}),
  vector: z.object({
    searchEnabled: z.boolean().default(true),
    embeddingDimension: z.number().int().default(1536),
    similarityScoreThreshold: z.number().default(0.7)
  }).default({}),
  logging: z.object({
    logLevel: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
    prettyPrintLogs: z.boolean().default(true),
    logFilePath: z.string().optional()
  }).default({})
}).default({});

export type ApplicationConfiguration = z.infer<typeof ConfigurationSchema>;

export interface SearchResultItem<TEntity extends CodeEntityData = CodeEntityData> {
  entityId: string;
  entityData: TEntity;
  relevanceScore: number;
  metadata?: Record<string, unknown>;
}

export interface CallChainPath {
  chainId: string;
  path: Array<{
    entityId: string;
    entityData: CodeEntityData;
    relation?: CodeRelationData;
  }>;
  depth: number;
}

export interface ClassInheritanceHierarchy {
  classEntityId: string;
  classEntityData: ClassCodeEntityData;
  ancestorClasses: Array<{
    entityId: string;
    entityData: ClassCodeEntityData;
    relation: ExtendsRelationData;
  }>;
  descendantClasses: Array<{
    entityId: string;
    entityData: ClassCodeEntityData;
    relation: ExtendsRelationData;
  }>;
}

export interface KnowledgeGraphStatistics {
  totalEntityCount: number;
  totalRelationCount: number;
  entityCountByType: Record<CodeEntityType, number>;
  relationCountByType: Record<CodeRelationType, number>;
  fileEntityCount: number;
  functionEntityCount: number;
  classEntityCount: number;
  averageCyclomaticComplexity?: number;
}

export interface SymbolInfo {
  name: string;
  entityId: string;
  symbolType: CodeEntityType;
  filePath: string;
  scopePath: string[];
  isExported: boolean;
  isDefaultExport: boolean;
}

export interface FileSymbolTable {
  filePath: string;
  localSymbols: Map<string, SymbolInfo>;
  exportedSymbols: Map<string, SymbolInfo>;
  importedSymbols: Map<string, {
    modulePath: string;
    symbolName: string;
    isDefault: boolean;
  }>;
  allSymbols: SymbolInfo[];
}

export interface ProjectSymbolTable {
  fileSymbolTables: Map<string, FileSymbolTable>;
  globalSymbolIndex: Map<string, SymbolInfo>;
  allSymbols: SymbolInfo[];
}
