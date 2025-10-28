import * as path from 'path';
import * as vscode from 'vscode';
import { FileNode, FolderNode, TreeNode } from '../types';

/**
 * ファイルパスのリストから階層ツリー構造を構築
 */
export function buildFileTree(files: vscode.Uri[]): TreeNode[] {
  console.log('[TreeBuilder] ツリー構築開始:', files.length, 'ファイル');
  
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!workspaceRoot || files.length === 0) {
    console.log('[TreeBuilder] ワークスペースルートが無いか、ファイルが0件');
    return [];
  }

  // パスをキーにしたフラットなマップを作成
  const nodeMap: Map<string, TreeNode> = new Map();
  
  for (const fileUri of files) {
    const relativePath = path.relative(workspaceRoot, fileUri.fsPath);
    const parts = relativePath.split(path.sep);
    
    let currentPath = '';
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const parentPath = currentPath;
      currentPath = currentPath ? path.join(currentPath, part) : part;
      
      if (i === parts.length - 1) {
        // ファイルノード
        const fileNode: FileNode = {
          type: 'file',
          label: part,
          resourceUri: fileUri
        };
        nodeMap.set(currentPath, fileNode);
      } else {
        // フォルダノード(既に存在する場合はスキップ)
        if (!nodeMap.has(currentPath)) {
          const folderNode: FolderNode = {
            type: 'folder',
            label: part,
            children: [],
            collapsibleState: vscode.TreeItemCollapsibleState.Expanded
          };
          nodeMap.set(currentPath, folderNode);
        }
      }
    }
  }
  
  // 階層構造を構築
  const rootNodes = buildHierarchy(nodeMap, workspaceRoot);
  console.log('[TreeBuilder] ツリー構築完了:', rootNodes.length, 'ルートノード');
  return rootNodes;
}

/**
 * フラットなマップから階層構造を構築
 */
function buildHierarchy(nodeMap: Map<string, TreeNode>, workspaceRoot: string): TreeNode[] {
  const rootNodes: TreeNode[] = [];
  
  // 各ノードを親ノードの children に追加
  for (const [nodePath, node] of nodeMap.entries()) {
    const parentPath = path.dirname(nodePath);
    
    if (parentPath === '.' || parentPath === nodePath) {
      // ルートレベルのノード
      rootNodes.push(node);
    } else {
      // 親ノードを探して children に追加
      const parentNode = nodeMap.get(parentPath);
      if (parentNode && parentNode.type === 'folder') {
        const folderNode = parentNode as FolderNode;
        if (!folderNode.children) {
          folderNode.children = [];
        }
        folderNode.children.push(node);
      }
    }
  }
  
  // 各フォルダの children をソート(フォルダ優先、名前順)
  sortTreeNodes(rootNodes);
  
  return rootNodes;
}

/**
 * ツリーノードを再帰的にソート
 */
function sortTreeNodes(nodes: TreeNode[]): void {
  nodes.sort((a, b) => {
    // フォルダを先に表示
    if (a.type === 'folder' && b.type !== 'folder') {
      return -1;
    }
    if (a.type !== 'folder' && b.type === 'folder') {
      return 1;
    }
    // 名前順
    return a.label.localeCompare(b.label);
  });
  
  // 子ノードも再帰的にソート
  for (const node of nodes) {
    if (node.children && node.children.length > 0) {
      sortTreeNodes(node.children);
    }
  }
}
