import * as vscode from 'vscode';
import { ConfigService } from '../services/configService';
import { ErrorHandler } from '../services/errorHandler';
import { FileSearchService } from '../services/fileSearchService';
import { ActionNode, ConfigNode, FolderNode, SearchState, SearchStateInfo, TreeBuildOptions, TreeNode } from '../types';
import { TreeBuilder } from '../utils/treeBuilder';

/**
 * 検索TreeDataProvider
 * 検索設定、アクション、検索結果をツリー表示
 */
export class SearchTreeProvider implements vscode.TreeDataProvider<TreeNode>, vscode.Disposable {
  private readonly _onDidChangeTreeData = new vscode.EventEmitter<TreeNode | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private readonly _disposables: vscode.Disposable[] = [];
  private readonly _configService: ConfigService;
  private readonly _fileSearchService: FileSearchService;
  
  private _searchResults: TreeNode[] = [];
  private _treeView?: vscode.TreeView<TreeNode>;
  private _searchState: SearchState = 'idle';
  private _lastSearchTime = 0;

  constructor() {
    this._configService = new ConfigService();
    this._fileSearchService = new FileSearchService();
    
    // 設定変更の監視
    this._disposables.push(
      this._configService
    );
  }

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
        ...this._searchResults
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
    return this.findParentInNodes(this._searchResults, element);
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
    const searchParams = this._configService.searchParams;
    return [
      {
        type: 'config',
        configKey: 'search',
        label: `🔍 検索: ${searchParams.searchPattern || '(未設定)'}`,
        value: searchParams.searchPattern
      },
      {
        type: 'config',
        configKey: 'include',
        label: `✅ 含める: ${searchParams.includePattern || '**/*'}`,
        value: searchParams.includePattern
      },
      {
        type: 'config',
        configKey: 'exclude',
        label: `❌ 除外: ${searchParams.excludePattern || '(なし)'}`,
        value: searchParams.excludePattern
      }
    ];
  }

  /**
   * アクションノードを取得
   */
  private getActionNode(): ActionNode {
    const label = this._searchState === 'searching' 
      ? '⏳ 検索中...' 
      : '🔄 検索を実行';
    
    return {
      type: 'action',
      actionType: 'execute',
      label
    };
  }

  /**
   * 検索パターンを更新
   */
  async updateSearchPattern(pattern: string): Promise<void> {
    console.log('[SearchTreeProvider] 検索パターン更新:', pattern);
    await this._configService.setSearchPattern(pattern);
    this.refresh();
  }

  /**
   * 含めるファイルパターンを更新
   */
  async updateIncludePattern(pattern: string): Promise<void> {
    console.log('[SearchTreeProvider] 含めるパターン更新:', pattern);
    await this._configService.setIncludePattern(pattern);
    this.refresh();
  }

  /**
   * 除外するファイルパターンを更新
   */
  async updateExcludePattern(pattern: string): Promise<void> {
    console.log('[SearchTreeProvider] 除外パターン更新:', pattern);
    await this._configService.setExcludePattern(pattern);
    this.refresh();
  }

  /**
   * TreeViewインスタンスを設定
   */
  setTreeView(treeView: vscode.TreeView<TreeNode>): void {
    this._treeView = treeView;
  }

  /**
   * 検索を実行
   */
  async executeSearch(): Promise<void> {
    console.log('[SearchTreeProvider] 検索実行');
    
    if (this._searchState === 'searching') {
      console.log('[SearchTreeProvider] 既に検索中です');
      return;
    }

    this._searchState = 'searching';
    this.refresh();
    
    try {
      const searchParams = this._configService.searchParams;
      const result = await this._fileSearchService.searchFiles(searchParams, {
        batchSize: 100,
        maxResults: 10000,
        showProgress: true
      });

      if (result.success) {
        const treeOptions: TreeBuildOptions = {
          sortFoldersFirst: true,
          expandAll: true,
          maxDepth: 20
        };
        
        this._searchResults = TreeBuilder.buildFileTree(result.data.files, treeOptions);
        this._lastSearchTime = result.data.searchTime;
        this._searchState = 'completed';
        
        this.refresh();
        
        // 検索結果がある場合、すべてのフォルダを展開
        if (result.data.files.length > 0) {
          await this.expandAllNodes();
        }
        
        // 結果の通知
        const message = result.data.files.length === 0 
          ? '該当するファイルが見つかりませんでした（0件）'
          : `${result.data.files.length}件のファイルが見つかりました（${result.data.searchTime}ms）`;
        
        await ErrorHandler.showInfo(message);
      } else {
        this._searchState = 'error';
        this.refresh();
        await ErrorHandler.showError(result.error, 'SearchTreeProvider.executeSearch');
      }
    } catch (error) {
      this._searchState = 'error';
      this.refresh();
      await ErrorHandler.showError(
        error instanceof Error ? error : new Error('不明なエラーが発生しました'),
        'SearchTreeProvider.executeSearch'
      );
    }
  }

  /**
   * 検索結果をクリア
   */
  clearResults(): void {
    console.log('[SearchTreeProvider] 検索結果をクリア');
    this._searchResults = [];
    this._searchState = 'idle';
    this.refresh();
  }

  /**
   * すべてのフォルダノードを展開
   */
  private async expandAllNodes(): Promise<void> {
    if (!this._treeView) {
      return;
    }

    try {
      // すべてのフォルダノードを再帰的に収集
      const folderNodes = this.collectFolderNodes(this._searchResults);
      
      // 各フォルダノードを展開
      for (const folderNode of folderNodes) {
        await this._treeView.reveal(folderNode, { expand: true });
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
   * 検索状態を取得
   */
  getSearchState(): SearchStateInfo {
    return {
      state: this._searchState,
      results: this._searchState === 'completed' ? {
        files: this._searchResults
          .filter(node => node.type === 'file')
          .map(node => (node as any).resourceUri)
          .filter(Boolean),
        totalCount: this._searchResults.length,
        searchTime: this._lastSearchTime,
        pattern: this._configService.searchParams.searchPattern
      } : undefined
    };
  }

  /**
   * ツリービューを再描画
   */
  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  /**
   * リソースをクリーンアップ
   */
  dispose(): void {
    this._disposables.forEach(disposable => disposable.dispose());
    this._disposables.length = 0;
    this._fileSearchService.dispose();
  }
}
