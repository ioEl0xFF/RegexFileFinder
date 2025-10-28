import * as vscode from 'vscode';
import { SearchTreeProvider } from '../providers/searchTreeProvider';

/**
 * 正規表現のバリデーション
 */
function validateRegex(value: string): string | null {
  if (!value || value.trim() === '') {
    return '正規表現パターンを入力してください';
  }
  
  try {
    new RegExp(value);
    return null; // バリデーション成功
  } catch (error) {
    return `無効な正規表現パターンです: ${error instanceof Error ? error.message : '不明なエラー'}`;
  }
}

/**
 * 検索関連のコマンドを登録
 */
export function registerSearchCommands(
  context: vscode.ExtensionContext,
  treeProvider: SearchTreeProvider
): void {
  console.log('[SearchCommands] コマンド登録開始');
  
  // 検索文字列編集
  context.subscriptions.push(
    vscode.commands.registerCommand('regexFileFinder.editSearchPattern', async () => {
      console.log('[SearchCommands] 検索文字列編集コマンド実行');
      const pattern = await vscode.window.showInputBox({
        prompt: '検索文字列を入力してください（正規表現）',
        placeHolder: '例: .*\\.tsx$',
        validateInput: validateRegex
      });
      if (pattern !== undefined) {
        await treeProvider.updateSearchPattern(pattern);
      }
    })
  );

  // 含めるファイル編集
  context.subscriptions.push(
    vscode.commands.registerCommand('regexFileFinder.editIncludePattern', async () => {
      console.log('[SearchCommands] 含めるファイル編集コマンド実行');
      const pattern = await vscode.window.showInputBox({
        prompt: '含めるファイルのパターンを入力（グロブパターン）',
        placeHolder: '例: **/*.ts または空欄で **/*'
      });
      if (pattern !== undefined) {
        await treeProvider.updateIncludePattern(pattern);
      }
    })
  );

  // 除外するファイル編集
  context.subscriptions.push(
    vscode.commands.registerCommand('regexFileFinder.editExcludePattern', async () => {
      console.log('[SearchCommands] 除外するファイル編集コマンド実行');
      const pattern = await vscode.window.showInputBox({
        prompt: '除外するファイルのパターンを入力（グロブパターン）',
        placeHolder: '例: **/node_modules/**'
      });
      if (pattern !== undefined) {
        await treeProvider.updateExcludePattern(pattern);
      }
    })
  );

  // 検索実行
  context.subscriptions.push(
    vscode.commands.registerCommand('regexFileFinder.executeSearch', async () => {
      console.log('[SearchCommands] 検索実行コマンド実行');
      await treeProvider.executeSearch();
    })
  );

  // 検索結果クリア
  context.subscriptions.push(
    vscode.commands.registerCommand('regexFileFinder.clearResults', async () => {
      console.log('[SearchCommands] 検索結果クリアコマンド実行');
      treeProvider.clearResults();
    })
  );
  
  console.log('[SearchCommands] コマンド登録完了');
}
