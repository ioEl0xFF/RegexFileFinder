import * as vscode from 'vscode';

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
