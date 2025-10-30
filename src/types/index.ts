import * as vscode from 'vscode';

/**
 * Result型パターン - 成功/失敗を型安全に表現
 */
export type Result<T, E = Error> = Success<T> | Failure<E>;

export interface Success<T> {
  success: true;
  data: T;
}

export interface Failure<E> {
  success: false;
  error: E;
}

/**
 * ツリーノードの種類
 */
export type TreeNodeType = 'config' | 'action' | 'folder' | 'file';

/**
 * ツリーノード基底インターフェース
 */
export interface TreeNode {
  type: TreeNodeType;
  label: string;
  resourceUri?: vscode.Uri;
  children?: TreeNode[];
  command?: vscode.Command;
}

/**
 * 検索設定ノード
 */
export interface ConfigNode extends TreeNode {
  type: 'config';
  configKey: 'search';
  value: string;
}

/**
 * アクションノード
 */
export interface ActionNode extends TreeNode {
  type: 'action';
  actionType: 'execute' | 'clear';
}

/**
 * フォルダノード
 */
export interface FolderNode extends TreeNode {
  type: 'folder';
  children: TreeNode[];
  collapsibleState: vscode.TreeItemCollapsibleState;
}

/**
 * ファイルノード
 */
export interface FileNode extends TreeNode {
  type: 'file';
  resourceUri: vscode.Uri;
}

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
 * 正規表現のバリデーション結果
 */
export interface RegexValidationResult {
  isValid: boolean;
  error?: string;
  warnings?: string[];
  complexity: 'low' | 'medium' | 'high';
}

/**
 * 設定の種類
 */
export type ConfigKey = 'search';

/**
 * アクションの種類
 */
export type ActionType = 'execute' | 'clear';

/**
 * ファイル検索のオプション
 */
export interface SearchOptions {
  batchSize?: number;
  maxResults?: number;
  showProgress?: boolean;
}

/**
 * ツリー構築のオプション
 */
export interface TreeBuildOptions {
  sortFoldersFirst?: boolean;
  expandAll?: boolean;
  maxDepth?: number;
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
 * ファイル名置き換え関連の型定義
 */

/**
 * 置き換えプレビュー情報
 */
export interface RenamePreview {
  /** 元のファイルURI */
  oldUri: vscode.Uri;
  /** 新しいファイルURI */
  newUri: vscode.Uri;
  /** 元のファイル名 */
  oldFileName: string;
  /** 新しいファイル名 */
  newFileName: string;
  /** 元のパス */
  oldPath: string;
  /** 新しいパス */
  newPath: string;
  /** ディレクトリ移動が必要か */
  needsDirectoryMove: boolean;
}

/**
 * 置き換え検証結果
 */
export interface RenameValidationResult {
  /** 検証が成功したか */
  isValid: boolean;
  /** エラーメッセージ */
  error?: string;
  /** 警告メッセージのリスト */
  warnings?: string[];
  /** 重複するファイル名のリスト */
  duplicateFiles?: RenamePreview[];
  /** 作成が必要なディレクトリのリスト */
  directoriesToCreate?: vscode.Uri[];
}

/**
 * 置き換え履歴情報（Undo/Redo用）
 */
export interface RenameHistory {
  /** Before/Afterのファイルパスマッピング */
  fileMapping: Array<{ from: vscode.Uri; to: vscode.Uri }>;
  /** 実行日時 */
  timestamp: number;
}

/**
 * 置き換えパラメータ
 */
export interface RenameParams {
  /** 検索パターン（正規表現） */
  searchPattern: string;
  /** 置換文字列 */
  replacement: string;
}

/**
 * 置き換え結果
 */
export interface RenameResult {
  /** 成功数 */
  successCount: number;
  /** 失敗数 */
  failureCount: number;
  /** エラー情報のリスト */
  errors?: Array<{ file: vscode.Uri; error: string }>;
}

