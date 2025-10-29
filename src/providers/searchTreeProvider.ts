import * as vscode from 'vscode';
import { searchFiles } from '../services/fileSearchService';
import { ActionNode, ConfigNode, FolderNode, SearchParams, TreeNode } from '../types';
import { buildFileTree } from '../utils/treeBuilder';

/**
 * 検索TreeDataProvider
 * 検索設定、アクション、検索結果をツリー表示
 */
export class SearchTreeProvider implements vscode.TreeDataProvider<TreeNode> {
  private _onDidChangeTreeData = new vscode.EventEmitter<TreeNode | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private searchParams: SearchParams = {
    searchPattern: '',
    includePattern: '',
    excludePattern: ''
  };
  private searchResults: TreeNode[] = [];
  private treeView?: vscode.TreeView<TreeNode>;

  /**
   * ツリーアイテムの表示情報を返す
   */
  getTreeItem(element: TreeNode): vscode.TreeItem {
    const treeItem = new vscode.TreeItem(element.label);
    
    switch (element.type) {
      case 'config':
        const configNode = element as ConfigNode;
        treeItem.iconPath = new vscode.ThemeIcon('edit');
        // configKeyを大文字始まりに変換してコマンドIDを生成
        const capitalizedKey = configNode.configKey.charAt(0).toUpperCase() + configNode.configKey.slice(1);
        treeItem.command = {
          command: `regexFileFinder.edit${capitalizedKey}Pattern`,
          title: '編集'
        };
        break;
        
      case 'action':
        treeItem.iconPath = new vscode.ThemeIcon('search');
        treeItem.command = {
          command: 'regexFileFinder.executeSearch',
          title: '実行'
        };
        break;
        
      case 'folder':
        const folderNode = element as FolderNode;
        treeItem.collapsibleState = folderNode.collapsibleState;
        treeItem.iconPath = vscode.ThemeIcon.Folder;
        break;
        
      case 'file':
        treeItem.resourceUri = element.resourceUri;
        treeItem.command = {
          command: 'vscode.open',
          title: 'ファイルを開く',
          arguments: [element.resourceUri]
        };
        break;
    }
    
    return treeItem;
  }

  /**
   * 子要素を取得
   */
  getChildren(element?: TreeNode): TreeNode[] {
    if (!element) {
      // ルート: 検索設定 + アクション + 検索結果
      return [
        ...this.getConfigNodes(),
        this.getActionNode(),
        ...this.searchResults
      ];
    }
    return element.children || [];
  }

  /**
   * 親要素を取得（revealメソッド使用のために必要）
   */
  getParent(element: TreeNode): TreeNode | undefined {
    // ルート要素の場合はundefinedを返す
    if (!element) {
      return undefined;
    }

    // 検索結果から親を検索
    return this.findParentInNodes(this.searchResults, element);
  }

  /**
   * ノードリストから指定された要素の親を検索
   */
  private findParentInNodes(nodes: TreeNode[], target: TreeNode): TreeNode | undefined {
    for (const node of nodes) {
      if (node.children) {
        // 直接の子かチェック
        if (node.children.includes(target)) {
          return node;
        }
        // 再帰的に子ノードを検索
        const found = this.findParentInNodes(node.children, target);
        if (found) {
          return found;
        }
      }
    }
    return undefined;
  }

  /**
   * 検索設定ノードを取得
   */
  private getConfigNodes(): ConfigNode[] {
    return [
      {
        type: 'config',
        configKey: 'search',
        label: `🔍 検索: ${this.searchParams.searchPattern || '(未設定)'}`,
        value: this.searchParams.searchPattern
      },
      {
        type: 'config',
        configKey: 'include',
        label: `✅ 含める: ${this.searchParams.includePattern || '**/*'}`,
        value: this.searchParams.includePattern
      },
      {
        type: 'config',
        configKey: 'exclude',
        label: `❌ 除外: ${this.searchParams.excludePattern || '(なし)'}`,
        value: this.searchParams.excludePattern
      }
    ];
  }

  /**
   * アクションノードを取得
   */
  private getActionNode(): ActionNode {
    return {
      type: 'action',
      actionType: 'execute',
      label: '🔄 検索を実行'
    };
  }

  /**
   * 検索パターンを更新
   */
  async updateSearchPattern(pattern: string): Promise<void> {
    console.log('[SearchTreeProvider] 検索パターン更新:', pattern);
    this.searchParams.searchPattern = pattern;
    this.refresh();
  }

  /**
   * 含めるファイルパターンを更新
   */
  async updateIncludePattern(pattern: string): Promise<void> {
    console.log('[SearchTreeProvider] 含めるパターン更新:', pattern);
    this.searchParams.includePattern = pattern;
    this.refresh();
  }

  /**
   * 除外するファイルパターンを更新
   */
  async updateExcludePattern(pattern: string): Promise<void> {
    console.log('[SearchTreeProvider] 除外パターン更新:', pattern);
    this.searchParams.excludePattern = pattern;
    this.refresh();
  }

  /**
   * TreeViewインスタンスを設定
   */
  setTreeView(treeView: vscode.TreeView<TreeNode>): void {
    this.treeView = treeView;
  }

  /**
   * 検索を実行
   */
  async executeSearch(): Promise<void> {
    console.log('[SearchTreeProvider] 検索実行');
    
    try {
      const results = await searchFiles(this.searchParams);
      this.searchResults = buildFileTree(results);
      this.refresh();
      
      // 検索結果がある場合、すべてのフォルダを展開
      if (results.length > 0) {
        await this.expandAllNodes();
      }
      
      // 結果の通知
      if (results.length === 0) {
        vscode.window.showInformationMessage('該当するファイルが見つかりませんでした（0件）');
      } else {
        vscode.window.showInformationMessage(`${results.length}件のファイルが見つかりました`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '不明なエラーが発生しました';
      vscode.window.showErrorMessage(`検索エラー: ${errorMessage}`);
    }
  }

  /**
   * 検索結果をクリア
   */
  clearResults(): void {
    console.log('[SearchTreeProvider] 検索結果をクリア');
    this.searchResults = [];
    this.refresh();
  }

  /**
   * すべてのフォルダノードを展開
   */
  private async expandAllNodes(): Promise<void> {
    if (!this.treeView) {
      return;
    }

    try {
      // すべてのフォルダノードを再帰的に収集
      const folderNodes = this.collectFolderNodes(this.searchResults);
      
      // 各フォルダノードを展開
      for (const folderNode of folderNodes) {
        await this.treeView.reveal(folderNode, { expand: true });
      }
    } catch (error) {
      console.warn('[SearchTreeProvider] ツリー展開エラー:', error);
    }
  }

  /**
   * フォルダノードを再帰的に収集
   */
  private collectFolderNodes(nodes: TreeNode[]): TreeNode[] {
    const folderNodes: TreeNode[] = [];
    
    for (const node of nodes) {
      if (node.type === 'folder') {
        folderNodes.push(node);
        // 子ノードも再帰的に収集
        if (node.children) {
          folderNodes.push(...this.collectFolderNodes(node.children));
        }
      }
    }
    
    return folderNodes;
  }

  /**
   * ツリービューを再描画
   */
  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }
}
