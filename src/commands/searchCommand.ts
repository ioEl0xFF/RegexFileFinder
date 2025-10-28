import * as vscode from 'vscode';
import { FileTreeProvider } from '../providers/fileTreeProvider';
import { searchFiles } from '../services/fileSearchService';

/**
 * 正規表現検索コマンドの登録
 */
export function registerSearchCommand(
  context: vscode.ExtensionContext,
  treeProvider: FileTreeProvider
): void {
  const disposable = vscode.commands.registerCommand('regexFileFinder.search', async () => {
    try {
      // 正規表現パターンの入力
      const pattern = await vscode.window.showInputBox({
        prompt: '正規表現パターンを入力してください',
        placeHolder: '例: .*\\.tsx$',
        validateInput: (value) => {
          if (!value || value.trim() === '') {
            return '正規表現パターンを入力してください';
          }
          
          // 正規表現の構文チェック
          try {
            new RegExp(value);
            return null;
          } catch (error) {
            return `無効な正規表現パターンです: ${error instanceof Error ? error.message : '不明なエラー'}`;
          }
        }
      });

      // 入力がキャンセルされた場合は処理中断
      if (pattern === undefined) {
        return;
      }

      // ワークスペースの存在確認
      if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
        vscode.window.showErrorMessage('ワークスペースを開いてから実行してください');
        return;
      }

      // 検索実行
      const matchedFiles = await searchFiles(pattern);

      // 検索結果の更新
      treeProvider.updateResults(matchedFiles);

      // 結果の通知
      if (matchedFiles.length === 0) {
        vscode.window.showInformationMessage('該当するファイルが見つかりませんでした（0件）');
      } else {
        vscode.window.showInformationMessage(`${matchedFiles.length}件のファイルが見つかりました`);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '不明なエラーが発生しました';
      vscode.window.showErrorMessage(`検索エラー: ${errorMessage}`);
    }
  });

  context.subscriptions.push(disposable);
}
