/** 应用程序基础错误类 */
export class ArktsCodeKnowledgeGraphError extends Error {
    readonly errorCode: string;
    readonly cause?: Error;
    readonly metadata?: Record<string, unknown>;

    constructor(
        message: string,
        errorCode: string = 'UNKNOWN_ERROR',
        options?: {
            cause?: Error;
            metadata?: Record<string, unknown>;
        }
    ) {
        super(message);
        this.name = 'ArktsCodeKnowledgeGraphError';
        this.errorCode = errorCode;
        this.cause = options?.cause;
        this.metadata = options?.metadata;
        Error.captureStackTrace(this, this.constructor);
    }

    /** 将错误转换为 JSON 对象 */
    toJSON(): Record<string, unknown> {
        return {
            name: this.name,
            message: this.message,
            errorCode: this.errorCode,
            cause: this.cause?.message,
            metadata: this.metadata,
            stack: this.stack
        };
    }
}

/** 代码解析错误 */
export class CodeParsingError extends ArktsCodeKnowledgeGraphError {
    readonly filePath?: string;

    constructor(
        message: string,
        filePath?: string,
        options?: {
            cause?: Error;
            metadata?: Record<string, unknown>;
        }
    ) {
        super(message, 'CODE_PARSING_ERROR', options);
        this.filePath = filePath;
        this.name = 'CodeParsingError';
    }
}

/** 知识图谱操作错误 */
export class KnowledgeGraphError extends ArktsCodeKnowledgeGraphError {
    constructor(
        message: string,
        options?: {
            cause?: Error;
            metadata?: Record<string, unknown>;
        }
    ) {
        super(message, 'KNOWLEDGE_GRAPH_ERROR', options);
        this.name = 'KnowledgeGraphError';
    }
}

/** 搜索操作错误 */
export class SearchOperationError extends ArktsCodeKnowledgeGraphError {
    constructor(
        message: string,
        options?: {
            cause?: Error;
            metadata?: Record<string, unknown>;
        }
    ) {
        super(message, 'SEARCH_OPERATION_ERROR', options);
        this.name = 'SearchOperationError';
    }
}

/** 配置错误 */
export class ConfigurationError extends ArktsCodeKnowledgeGraphError {
    constructor(
        message: string,
        options?: {
            cause?: Error;
            metadata?: Record<string, unknown>;
        }
    ) {
        super(message, 'CONFIGURATION_ERROR', options);
        this.name = 'ConfigurationError';
    }
}

/** 文件读取错误 */
export class FileReadingError extends ArktsCodeKnowledgeGraphError {
    readonly filePath: string;

    constructor(
        message: string,
        filePath: string,
        options?: {
            cause?: Error;
        }
    ) {
        super(message, 'FILE_READING_ERROR', {
            cause: options?.cause,
            metadata: { filePath }
        });
        this.filePath = filePath;
        this.name = 'FileReadingError';
    }
}
