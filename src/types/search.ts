import * as vscode from 'vscode';

/**
 * 検索パラメータ
 */
export interface SearchParams {
  searchPattern: string;
  includeFolders: string[];
  excludeFolders: string[];
}

/**
 * 検索結果
 */
export interface SearchResult {
  files: vscode.Uri[];
  totalCount: number;
  searchTime: number;
  pattern: string;
}

/**
 * ファイル検索のオプション
 */
export interface SearchOptions {
  batchSize?: number;
  maxResults?: number;
  showProgress?: boolean;
}

/**
 * パフォーマンス統計
 */
export interface PerformanceStats {
  searchTime: number;
  fileCount: number;
  memoryUsage: number;
  batchCount: number;
}

/**
 * 検索の状態
 */
export type SearchState = 'idle' | 'searching' | 'completed' | 'error';

/**
 * 検索状態の情報
 */
export interface SearchStateInfo {
  state: SearchState;
  error?: string;
  results?: SearchResult;
}

/**
 * 正規表現のバリデーション結果
 */
export interface RegexValidationResult {
  isValid: boolean;
  error?: string;
  warnings?: string[];
  complexity: 'low' | 'medium' | 'high';
}
