import * as vscode from 'vscode';

// ファイルアイテム（ツリービュー用）
export interface FileItem {
  label: string;           // 表示名（相対パス）
  resourceUri: vscode.Uri; // ファイルの絶対パス
}
