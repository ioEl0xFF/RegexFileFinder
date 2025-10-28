import * as vscode from 'vscode';

// ツリーノードの種類
export type TreeNodeType = 'config' | 'action' | 'folder' | 'file';

// ツリーノード基底
export interface TreeNode {
  type: TreeNodeType;
  label: string;
  resourceUri?: vscode.Uri;
  children?: TreeNode[];
  command?: vscode.Command;
}

// 検索設定ノード
export interface ConfigNode extends TreeNode {
  type: 'config';
  configKey: 'search' | 'include' | 'exclude';
  value: string;
}

// アクションノード
export interface ActionNode extends TreeNode {
  type: 'action';
  actionType: 'execute' | 'clear';
}

// フォルダノード
export interface FolderNode extends TreeNode {
  type: 'folder';
  children: TreeNode[];
  collapsibleState: vscode.TreeItemCollapsibleState;
}

// ファイルノード
export interface FileNode extends TreeNode {
  type: 'file';
  resourceUri: vscode.Uri;
}

// 検索パラメータ
export interface SearchParams {
  searchPattern: string;
  includePattern: string;
  excludePattern: string;
}

// ファイルアイテム（ツリービュー用）- 後方互換性のため残す
export interface FileItem {
  label: string;           // 表示名（相対パス）
  resourceUri: vscode.Uri; // ファイルの絶対パス
}
