import { CodeEntityType, CodeRelationType } from '../../shared'

export function toEntityType(type: string): CodeEntityType {
  const mapping: Record<string, CodeEntityType> = {
    'File': CodeEntityType.FILE,
    'Class': CodeEntityType.CLASS,
    'Function': CodeEntityType.FUNCTION,
    'Interface': CodeEntityType.INTERFACE,
    'Enum': CodeEntityType.ENUM,
    'Method': CodeEntityType.METHOD,
    'Property': CodeEntityType.PROPERTY,
    'Variable': CodeEntityType.VARIABLE,
    'Module': CodeEntityType.MODULE,
    'TypeAlias': CodeEntityType.UNKNOWN,
    'Unknown': CodeEntityType.UNKNOWN,
  }
  return mapping[type] || CodeEntityType.UNKNOWN
}

export function toRelationType(type: string): CodeRelationType {
  const mapping: Record<string, CodeRelationType> = {
    'CALLS': CodeRelationType.CALLS,
    'EXTENDS': CodeRelationType.EXTENDS,
    'IMPLEMENTS': CodeRelationType.IMPLEMENTS,
    'REFERENCES': CodeRelationType.REFERENCES,
    'IMPORTS': CodeRelationType.IMPORTS,
    'EXPORTS': CodeRelationType.EXPORTS,
    'CONTAINS': CodeRelationType.CONTAINS,
    'INSTANTIATES': CodeRelationType.INSTANTIATES,
    'DependsOn': CodeRelationType.DEPENDS_ON,
  }
  return mapping[type] || CodeRelationType.DEPENDS_ON
}
