import * as vscode from 'vscode';
import { SearchInputViewProvider } from '../providers/searchInputViewProvider';
import { SearchTreeProvider } from '../providers/searchTreeProvider';
import { ErrorHandler } from '../services/errorHandler';

/**
 * 検索関連のコマンドを登録
 */
export function registerSearchCommands(
  context: vscode.ExtensionContext,
  treeProvider: SearchTreeProvider,
  inputProvider: SearchInputViewProvider
): void {
  
  // 検索実行
  context.subscriptions.push(
    vscode.commands.registerCommand('regexFileFinder.executeSearch', async () => {
      
      await ErrorHandler.handleAsync(async () => {
        await treeProvider.executeSearch();
      }, 'SearchCommands.executeSearch');
    })
  );

  // 検索結果クリア
  context.subscriptions.push(
    vscode.commands.registerCommand('regexFileFinder.clearResults', async () => {
      
      await ErrorHandler.handleAsync(async () => {
        treeProvider.clearResults();
        await ErrorHandler.showInfo('検索結果をクリアしました');
      }, 'SearchCommands.clearResults');
    })
  );

  // すべて展開
  context.subscriptions.push(
    vscode.commands.registerCommand('regexFileFinder.expandAll', async () => {
      
      await ErrorHandler.handleAsync(async () => {
        await treeProvider.expandAllNodes();
        await ErrorHandler.showInfo('すべてのフォルダを展開しました');
      }, 'SearchCommands.expandAll');
    })
  );

  // すべて折りたたむ
  context.subscriptions.push(
    vscode.commands.registerCommand('regexFileFinder.collapseAll', async () => {
      
      await ErrorHandler.handleAsync(async () => {
        await treeProvider.collapseAllNodes();
        await ErrorHandler.showInfo('すべてのフォルダを折りたたみました');
      }, 'SearchCommands.collapseAll');
    })
  );

  // ファイル名を置き換え（コマンドパレット経由の呼び出し用）
  context.subscriptions.push(
    vscode.commands.registerCommand('regexFileFinder.executeRename', async () => {
      await ErrorHandler.handleAsync(async () => {
        // Webview側のメッセージハンドラーを経由して実行
        // 実際の処理はSearchInputViewProviderのexecuteRename()で行われる
        await ErrorHandler.showInfo('置き換え機能は検索条件ビューのボタンから利用できます');
      }, 'SearchCommands.executeRename');
    })
  );

  // Undo（コマンドパレット経由の呼び出し用）
  context.subscriptions.push(
    vscode.commands.registerCommand('regexFileFinder.undoRename', async () => {
      await ErrorHandler.handleAsync(async () => {
        // Webview側のメッセージハンドラーを経由して実行
        await ErrorHandler.showInfo('Undo機能は検索条件ビューのボタンから利用できます');
      }, 'SearchCommands.undoRename');
    })
  );

  // Redo（コマンドパレット経由の呼び出し用）
  context.subscriptions.push(
    vscode.commands.registerCommand('regexFileFinder.redoRename', async () => {
      await ErrorHandler.handleAsync(async () => {
        // Webview側のメッセージハンドラーを経由して実行
        await ErrorHandler.showInfo('Redo機能は検索条件ビューのボタンから利用できます');
      }, 'SearchCommands.redoRename');
    })
  );
  
}
