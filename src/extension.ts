import * as vscode from 'vscode';
import { registerSearchCommands } from './commands/searchCommands';
import { SearchInputViewProvider } from './providers/searchInputViewProvider';
import { SearchTreeProvider } from './providers/searchTreeProvider';
import { ERROR_MESSAGES, ErrorHandler } from './services/errorHandler';

/**
 * 拡張機能のアクティベーション処理
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {

  try {
    // 検索TreeProviderの初期化
    const searchTreeProvider = new SearchTreeProvider();
    
    // TreeViewの登録
    const treeView = vscode.window.createTreeView('regexFileFinder.searchResults', {
      treeDataProvider: searchTreeProvider
    });
    context.subscriptions.push(treeView);

    // TreeViewインスタンスをプロバイダーに設定
    searchTreeProvider.setTreeView(treeView);

    // 入力ビュー（WebviewView）の登録
    const inputProvider = new SearchInputViewProvider(context, searchTreeProvider);
    context.subscriptions.push(
      vscode.window.registerWebviewViewProvider(SearchInputViewProvider.viewId, inputProvider)
    );

    // コマンドの登録
    registerSearchCommands(context, searchTreeProvider, inputProvider);

    // プロバイダーをコンテキストに追加（クリーンアップ用）
    context.subscriptions.push(searchTreeProvider);
    context.subscriptions.push(inputProvider);

    // 初期化時の自動検索実行
    try {
      await searchTreeProvider.executeSearchIfConfigured();
    } catch (error) {
      console.warn('[RegexFileFinder] 初期化時の自動検索エラー:', error);
      // エラーが発生しても拡張機能の初期化は継続
    }
  } catch (error) {
    console.error('[RegexFileFinder] 初期化エラー:', error);
    ErrorHandler.showError(
      error instanceof Error ? error : new Error(ERROR_MESSAGES.UNKNOWN_ERROR),
      'Extension.activate'
    );
  }
}

/**
 * 拡張機能の非アクティベーション処理
 */
export function deactivate(): void {
  
  try {
    // リソースのクリーンアップは context.subscriptions で自動的に実行される
    // 進行中の非同期処理は自動的にキャンセルされる
  } catch (error) {
    // キャンセルエラーは無視（拡張機能終了時の正常な動作）
    if (error instanceof Error && error.name !== 'Canceled') {
      console.error('[RegexFileFinder] クリーンアップエラー:', error);
    }
  }
}
