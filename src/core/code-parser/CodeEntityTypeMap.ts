import { CodeEntityType } from '../../shared/index.js';

export const CodeEntityTypeMap = {
    FILE: CodeEntityType.FILE,
    MODULE: CodeEntityType.MODULE,
    CLASS: CodeEntityType.CLASS,
    FUNCTION: CodeEntityType.FUNCTION,
    VARIABLE: CodeEntityType.VARIABLE,
    INTERFACE: CodeEntityType.INTERFACE,
    ENUM: CodeEntityType.ENUM,
    METHOD: CodeEntityType.METHOD,
    PROPERTY: CodeEntityType.PROPERTY,
    TYPEALIAS: 'TypeAlias',
    UNKNOWN: CodeEntityType.UNKNOWN,
};

export type CodeEntityTypeString = 'File' | 'Module' | 'Class' | 'Function' | 'Variable' | 'Interface' | 'Enum' | 'Method' | 'Property' | 'TypeAlias' | 'Unknown';

export function toCodeEntityType(type: string): CodeEntityType {
    const mapping: Record<string, CodeEntityType> = {
        'File': CodeEntityType.FILE,
        'Module': CodeEntityType.MODULE,
        'Class': CodeEntityType.CLASS,
        'Function': CodeEntityType.FUNCTION,
        'Variable': CodeEntityType.VARIABLE,
        'Interface': CodeEntityType.INTERFACE,
        'Enum': CodeEntityType.ENUM,
        'Method': CodeEntityType.METHOD,
        'Property': CodeEntityType.PROPERTY,
        'Unknown': CodeEntityType.UNKNOWN,
    };
    return mapping[type] || CodeEntityType.UNKNOWN;
}
