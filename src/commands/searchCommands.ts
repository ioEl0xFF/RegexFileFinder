import * as vscode from 'vscode';
import { SearchTreeProvider } from '../providers/searchTreeProvider';
import { ErrorHandler } from '../services/errorHandler';
import { t } from '../utils/i18n';

/**
 * 検索関連のコマンドを登録
 */
export function registerSearchCommands(
  context: vscode.ExtensionContext,
  treeProvider: SearchTreeProvider
): void {
  // 検索実行
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'regexFileFinder.executeSearch',
      async () => {
        await ErrorHandler.handleAsync(async () => {
          await treeProvider.executeSearch();
        }, 'SearchCommands.executeSearch');
      }
    )
  );

  // 検索結果クリア
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'regexFileFinder.clearResults',
      async () => {
        await ErrorHandler.handleAsync(async () => {
          treeProvider.clearResults();
          await ErrorHandler.showInfo(t('commands.resultsCleared'));
        }, 'SearchCommands.clearResults');
      }
    )
  );

  // すべて展開
  context.subscriptions.push(
    vscode.commands.registerCommand('regexFileFinder.expandAll', async () => {
      await ErrorHandler.handleAsync(async () => {
        await treeProvider.expandAllNodes();
        await ErrorHandler.showInfo(t('commands.allFoldersExpanded'));
      }, 'SearchCommands.expandAll');
    })
  );

  // すべて折りたたむ
  context.subscriptions.push(
    vscode.commands.registerCommand('regexFileFinder.collapseAll', async () => {
      await ErrorHandler.handleAsync(async () => {
        await treeProvider.collapseAllNodes();
        await ErrorHandler.showInfo(t('commands.allFoldersCollapsed'));
      }, 'SearchCommands.collapseAll');
    })
  );
}
