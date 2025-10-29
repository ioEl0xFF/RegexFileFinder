import * as path from 'path';
import * as vscode from 'vscode';
import { FileNode, FolderNode, PerformanceStats, TreeBuildOptions, TreeNode } from '../types';

/**
 * ツリービルダークラス
 * ファイルパスのリストから階層ツリー構造を効率的に構築
 */
export class TreeBuilder {
  private static readonly DEFAULT_BATCH_SIZE = 1000;
  private static readonly MAX_DEPTH = 50;

  /**
   * ファイルパスのリストから階層ツリー構造を構築
   */
  static buildFileTree(
    files: vscode.Uri[], 
    options: TreeBuildOptions = {}
  ): TreeNode[] {
    const startTime = Date.now();
    console.log('[TreeBuilder] ツリー構築開始:', files.length, 'ファイル');
    
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot || files.length === 0) {
      console.log('[TreeBuilder] ワークスペースルートが無いか、ファイルが0件');
      return [];
    }

    try {
      // バッチ処理でノードマップを構築
      const nodeMap = this.buildNodeMap(files, workspaceRoot, options);
      
      // 階層構造を構築
      const rootNodes = this.buildHierarchy(nodeMap, workspaceRoot, options);
      
      const buildTime = Date.now() - startTime;
      console.log(`[TreeBuilder] ツリー構築完了: ${rootNodes.length}ルートノード (${buildTime}ms)`);
      
      return rootNodes;
    } catch (error) {
      console.error('[TreeBuilder] ツリー構築エラー:', error);
      return [];
    }
  }

  /**
   * ノードマップを構築（バッチ処理対応）
   */
  private static buildNodeMap(
    files: vscode.Uri[], 
    workspaceRoot: string, 
    options: TreeBuildOptions
  ): Map<string, TreeNode> {
    const nodeMap = new Map<string, TreeNode>();
    const batchSize = options.maxDepth ? Math.min(options.maxDepth, this.DEFAULT_BATCH_SIZE) : this.DEFAULT_BATCH_SIZE;
    
    // ファイルをバッチに分割して処理
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      this.processBatch(batch, workspaceRoot, nodeMap, options);
      
      // UIをブロックしないように制御を譲る
      if (i + batchSize < files.length) {
        // 非同期処理を同期的に待機（次のイベントループに譲る）
        setImmediate(() => {});
      }
    }
    
    return nodeMap;
  }

  /**
   * ファイルのバッチを処理
   */
  private static processBatch(
    files: vscode.Uri[], 
    workspaceRoot: string, 
    nodeMap: Map<string, TreeNode>,
    options: TreeBuildOptions
  ): void {
    for (const fileUri of files) {
      try {
        const relativePath = path.relative(workspaceRoot, fileUri.fsPath);
        const parts = relativePath.split(path.sep);
        
        // 最大深度チェック
        if (options.maxDepth && parts.length > options.maxDepth) {
          console.warn(`[TreeBuilder] 最大深度を超過: ${relativePath}`);
          continue;
        }
        
        this.createNodesForPath(parts, fileUri, nodeMap);
      } catch (error) {
        console.warn(`[TreeBuilder] ファイル処理エラー: ${fileUri.fsPath}`, error);
      }
    }
  }

  /**
   * パスの各部分に対応するノードを作成
   */
  private static createNodesForPath(
    parts: string[], 
    fileUri: vscode.Uri, 
    nodeMap: Map<string, TreeNode>
  ): void {
    let currentPath = '';
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const parentPath = currentPath;
      currentPath = currentPath ? path.join(currentPath, part) : part;
      
      if (i === parts.length - 1) {
        // ファイルノード
        if (!nodeMap.has(currentPath)) {
          const fileNode: FileNode = {
            type: 'file',
            label: part,
            resourceUri: fileUri
          };
          nodeMap.set(currentPath, fileNode);
        }
      } else {
        // フォルダノード（既に存在する場合はスキップ）
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

  /**
   * フラットなマップから階層構造を構築
   */
  private static buildHierarchy(
    nodeMap: Map<string, TreeNode>, 
    workspaceRoot: string, 
    options: TreeBuildOptions
  ): TreeNode[] {
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
    
    // ソート設定に基づいてソート
    if (options.sortFoldersFirst !== false) {
      this.sortTreeNodes(rootNodes);
    }
    
    return rootNodes;
  }

  /**
   * ツリーノードを再帰的にソート
   */
  private static sortTreeNodes(nodes: TreeNode[]): void {
    nodes.sort((a, b) => {
      // フォルダを先に表示
      if (a.type === 'folder' && b.type !== 'folder') {
        return -1;
      }
      if (a.type !== 'folder' && b.type === 'folder') {
        return 1;
      }
      // 名前順（大文字小文字を区別しない）
      return a.label.localeCompare(b.label, undefined, { 
        sensitivity: 'base',
        numeric: true 
      });
    });
    
    // 子ノードも再帰的にソート
    for (const node of nodes) {
      if (node.children && node.children.length > 0) {
        this.sortTreeNodes(node.children);
      }
    }
  }

  /**
   * ツリーの統計情報を取得
   */
  static getTreeStats(nodes: TreeNode[]): PerformanceStats {
    let fileCount = 0;
    let folderCount = 0;
    let maxDepth = 0;

    const countNodes = (nodeList: TreeNode[], depth: number = 0): void => {
      maxDepth = Math.max(maxDepth, depth);
      
      for (const node of nodeList) {
        if (node.type === 'file') {
          fileCount++;
        } else if (node.type === 'folder') {
          folderCount++;
          if (node.children && node.children.length > 0) {
            countNodes(node.children, depth + 1);
          }
        }
      }
    };

    countNodes(nodes);

    return {
      searchTime: 0, // ツリー構築時間は別途管理
      fileCount,
      memoryUsage: process.memoryUsage().heapUsed,
      batchCount: Math.ceil((fileCount + folderCount) / this.DEFAULT_BATCH_SIZE)
    };
  }

  /**
   * ツリーを最適化（不要な空フォルダを削除など）
   */
  static optimizeTree(nodes: TreeNode[]): TreeNode[] {
    return nodes.filter(node => {
      if (node.type === 'folder') {
        const folderNode = node as FolderNode;
        if (folderNode.children && folderNode.children.length > 0) {
          // 子ノードも再帰的に最適化
          folderNode.children = this.optimizeTree(folderNode.children);
          return folderNode.children.length > 0;
        }
        return false; // 空のフォルダは削除
      }
      return true; // ファイルは保持
    });
  }
}

/**
 * 後方互換性のための関数（非推奨）
 * @deprecated TreeBuilder.buildFileTree()を使用してください
 */
export function buildFileTree(files: vscode.Uri[]): TreeNode[] {
  return TreeBuilder.buildFileTree(files);
}
