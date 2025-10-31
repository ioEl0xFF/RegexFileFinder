import * as vscode from 'vscode';

/**
 * ツリーノードの種類
 */
export type TreeNodeType = 'config' | 'action' | 'folder' | 'file';

/**
 * 設定の種類
 */
export type ConfigKey = 'search';

/**
 * アクションの種類
 */
export type ActionType = 'execute' | 'clear';

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
 * ツリー構築のオプション
 */
export interface TreeBuildOptions {
  sortFoldersFirst?: boolean;
  expandAll?: boolean;
  maxDepth?: number;
}
