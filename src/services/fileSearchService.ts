import * as path from 'path';
import * as vscode from 'vscode';

/**
 * ファイル検索サービス
 * 正規表現パターンでファイル名を検索する
 */
export async function searchFiles(pattern: string): Promise<vscode.Uri[]> {
  try {
    // ワークスペースの存在確認
    if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
      throw new Error('ワークスペースが開かれていません');
    }

    // 正規表現の構文チェック
    new RegExp(pattern);

    // 全ファイルを取得（VSCodeの設定を尊重）
    const allFiles = await vscode.workspace.findFiles('**/*', null);

    // ファイル名で正規表現マッチング
    const matchedFiles: vscode.Uri[] = [];
    
    for (const fileUri of allFiles) {
      const fileName = path.basename(fileUri.fsPath);
      const regex = new RegExp(pattern);
      
      if (regex.test(fileName)) {
        matchedFiles.push(fileUri);
      }
    }

    return matchedFiles;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`無効な正規表現パターンです: ${error.message}`);
    }
    throw error;
  }
}
