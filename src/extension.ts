import * as vscode from 'vscode';
import { registerSearchCommands } from './commands/searchCommands';
import { SearchTreeProvider } from './providers/searchTreeProvider';
import { ErrorHandler } from './services/errorHandler';

/**
 * 拡張機能のアクティベーション処理
 */
export function activate(context: vscode.ExtensionContext): void {
  console.log('[RegexFileFinder] 拡張機能がアクティベートされました');

  try {
    // 検索TreeProviderの初期化
    const searchTreeProvider = new SearchTreeProvider();
    
    // TreeViewの登録
    const treeView = vscode.window.createTreeView('regexFileFinder.searchView', {
      treeDataProvider: searchTreeProvider
    });
    context.subscriptions.push(treeView);
    console.log('[RegexFileFinder] TreeView登録完了');

    // TreeViewインスタンスをプロバイダーに設定
    searchTreeProvider.setTreeView(treeView);

    // コマンドの登録
    registerSearchCommands(context, searchTreeProvider);

    // プロバイダーをコンテキストに追加（クリーンアップ用）
    context.subscriptions.push(searchTreeProvider);

    console.log('[RegexFileFinder] 初期化完了');
  } catch (error) {
    console.error('[RegexFileFinder] 初期化エラー:', error);
    ErrorHandler.showError(
      error instanceof Error ? error : new Error('拡張機能の初期化に失敗しました'),
      'Extension.activate'
    );
  }
}

/**
 * 拡張機能の非アクティベーション処理
 */
export function deactivate(): void {
  console.log('[RegexFileFinder] 拡張機能が非アクティベートされました');
  
  try {
    // リソースのクリーンアップは context.subscriptions で自動的に実行される
    console.log('[RegexFileFinder] クリーンアップ完了');
  } catch (error) {
    console.error('[RegexFileFinder] クリーンアップエラー:', error);
  }
}
