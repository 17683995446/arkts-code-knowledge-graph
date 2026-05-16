export { SemanticSearchEngine } from './SemanticSearchEngine.js';
export { EnhancedSearchEngine } from './EnhancedSearchEngine.js';

export type { 
  VectorConfig, 
  VectorDocument, 
  SearchResult as SemanticSearchResult,
  SemanticSearchConfig 
} from './SemanticSearchEngine.js';

export type {
  VectorDatabaseType,
  VectorStoreConfig,
  SearchQuery,
  SearchFilter,
  SearchResult,
  SearchStats,
  SearchEngineConfig,
} from './EnhancedSearchEngine.js';