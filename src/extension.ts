import * as vscode from 'vscode';
import { registerAllCommands } from './commands';
import { SearchInputViewProvider } from './providers/searchInputViewProvider';
import { SearchTreeProvider } from './providers/searchTreeProvider';
import { ErrorHandler } from './services/errorHandler';
import { Logger } from './services/logger';
import { initializeI18n, t } from './utils/i18n';

/**
 * 拡張機能のアクティベーション処理
 */
export async function activate(
  context: vscode.ExtensionContext
): Promise<void> {
  try {
    // Loggerの初期化（ExtensionContextを設定）
    Logger.initialize(context);

    // i18nの初期化
    initializeI18n(context);

    // 検索TreeProviderの初期化
    const searchTreeProvider = new SearchTreeProvider();

    // TreeViewの登録
    const treeView = vscode.window.createTreeView(
      'regexFileFinder.searchResults',
      {
        treeDataProvider: searchTreeProvider,
      }
    );
    context.subscriptions.push(treeView);

    // TreeViewインスタンスをプロバイダーに設定
    searchTreeProvider.setTreeView(treeView);

    // 入力ビュー（WebviewView）の登録
    const inputProvider = new SearchInputViewProvider(
      context,
      searchTreeProvider
    );
    context.subscriptions.push(
      vscode.window.registerWebviewViewProvider(
        SearchInputViewProvider.viewId,
        inputProvider
      )
    );

    // コマンドの登録
    registerAllCommands(context, searchTreeProvider);

    // プロバイダーをコンテキストに追加（クリーンアップ用）
    context.subscriptions.push(searchTreeProvider);
    context.subscriptions.push(inputProvider);

    // Loggerをコンテキストに追加（クリーンアップ用）
    const logger = Logger.getInstance();
    if (logger) {
      context.subscriptions.push(logger);
    }

    // 初期化時の自動検索実行
    try {
      await searchTreeProvider.executeSearchIfConfigured();
    } catch (error) {
      Logger.logWarning(
        '初期化時の自動検索でエラーが発生しました',
        'Extension'
      );
      Logger.logError(
        error instanceof Error ? error : new Error(String(error)),
        'Extension.activate'
      );
      // エラーが発生しても拡張機能の初期化は継続
    }
  } catch (error) {
    Logger.logError(
      error instanceof Error ? error : new Error(t('errors.unknownError')),
      'Extension.activate'
    );
    ErrorHandler.showError(
      error instanceof Error ? error : new Error(t('errors.unknownError')),
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
      Logger.logError(error, 'Extension.deactivate');
    }
  }
}
