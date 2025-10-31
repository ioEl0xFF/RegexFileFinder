import * as vscode from 'vscode';
import { ErrorHandler } from '../services/errorHandler';
import { t } from '../utils/i18n';

/**
 * リネーム関連のコマンドを登録
 */
export function registerRenameCommands(context: vscode.ExtensionContext): void {
  // ファイル名を置き換え（コマンドパレット経由の呼び出し用）
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'regexFileFinder.executeRename',
      async () => {
        await ErrorHandler.handleAsync(async () => {
          // Webview側のメッセージハンドラーを経由して実行
          // 実際の処理はSearchInputViewProviderのexecuteRename()で行われる
          await ErrorHandler.showInfo(t('commands.renameAvailableFromView'));
        }, 'RenameCommands.executeRename');
      }
    )
  );

  // Undo（コマンドパレット経由の呼び出し用）
  context.subscriptions.push(
    vscode.commands.registerCommand('regexFileFinder.undoRename', async () => {
      await ErrorHandler.handleAsync(async () => {
        // Webview側のメッセージハンドラーを経由して実行
        await ErrorHandler.showInfo(t('commands.undoAvailableFromView'));
      }, 'RenameCommands.undoRename');
    })
  );

  // Redo（コマンドパレット経由の呼び出し用）
  context.subscriptions.push(
    vscode.commands.registerCommand('regexFileFinder.redoRename', async () => {
      await ErrorHandler.handleAsync(async () => {
        // Webview側のメッセージハンドラーを経由して実行
        await ErrorHandler.showInfo(t('commands.redoAvailableFromView'));
      }, 'RenameCommands.redoRename');
    })
  );
}
