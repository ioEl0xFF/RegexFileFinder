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
   * 検索を実行
   */
  async executeSearch(): Promise<void> {
    console.log('[SearchTreeProvider] 検索実行');
    
    try {
      const results = await searchFiles(this.searchParams);
      this.searchResults = buildFileTree(results);
      this.refresh();
      
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
   * ツリービューを再描画
   */
  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }
}
