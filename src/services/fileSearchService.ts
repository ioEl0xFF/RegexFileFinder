import * as path from 'path';
import * as vscode from 'vscode';
import { SearchParams } from '../types';

/**
 * ファイル検索サービス
 * グロブパターンと正規表現でファイル名を検索する
 */
export async function searchFiles(params: SearchParams): Promise<vscode.Uri[]> {
  console.log('[FileSearchService] 検索開始:', params);
  
  try {
    // ワークスペースの存在確認
    if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
      throw new Error('ワークスペースが開かれていません');
    }

    // 検索パターンが空の場合はエラー
    if (!params.searchPattern || params.searchPattern.trim() === '') {
      throw new Error('検索文字列を入力してください');
    }

    // 正規表現の構文チェック
    let regex: RegExp;
    try {
      regex = new RegExp(params.searchPattern);
    } catch (error) {
      throw new Error(`無効な正規表現パターンです: ${error instanceof Error ? error.message : '不明なエラー'}`);
    }

    // includeパターンでファイル取得
    const includeGlob = params.includePattern || '**/*';
    const excludeGlob = params.excludePattern || null;
    
    console.log('[FileSearchService] グロブパターン - include:', includeGlob, 'exclude:', excludeGlob);
    
    const allFiles = await vscode.workspace.findFiles(
      includeGlob,
      excludeGlob
    );
    
    console.log(`[FileSearchService] 対象ファイル数: ${allFiles.length}`);
    
    // 検索パターンでフィルタリング(ファイル名のみ)
    const matchedFiles = allFiles.filter(file => {
      const fileName = path.basename(file.fsPath);
      return regex.test(fileName);
    });
    
    console.log(`[FileSearchService] マッチ件数: ${matchedFiles.length}`);
    return matchedFiles;
  } catch (error) {
    console.error('[FileSearchService] エラー:', error);
    throw error;
  }
}
