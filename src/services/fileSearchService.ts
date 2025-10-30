import * as path from 'path';
import * as vscode from 'vscode';
import { Result, SearchOptions, SearchParams, SearchResult } from '../types';
import { RegexValidator } from '../utils/regexValidator';
import { ERROR_MESSAGES, ErrorHandler, SearchError } from './errorHandler';

/**
 * ファイル検索サービス
 * グロブパターンと正規表現でファイル名を検索する
 */
export class FileSearchService implements vscode.Disposable {
  private readonly _disposables: vscode.Disposable[] = [];
  private _isSearching = false;
  private _currentSearchId: string | null = null;

  /**
   * ファイル検索を実行
   */
  async searchFiles(
    params: SearchParams, 
    options: SearchOptions = {}
  ): Promise<Result<SearchResult, SearchError>> {
    const searchId = this.generateSearchId();
    this._currentSearchId = searchId;
    this._isSearching = true;
    const startTime = Date.now();


    // プログレスバーを1つだけ生成
    return await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: 'ファイルを検索中...',
      cancellable: true
    }, async (progress, token) => {
      try {

        // キャンセル処理
        token.onCancellationRequested(() => {
          this._currentSearchId = null;
          console.log('[FileSearchService] 検索がキャンセルされました');
        });

        // ワークスペースの存在確認
        if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
          throw new SearchError(ERROR_MESSAGES.WORKSPACE_NOT_OPEN);
        }

        // 検索パターンのバリデーション
        const validation = RegexValidator.validate(params.searchPattern);
        if (!validation.isValid) {
          throw new SearchError(validation.error || ERROR_MESSAGES.INVALID_REGEX);
        }

        // 警告がある場合は表示
        if (validation.warnings && validation.warnings.length > 0) {
          await ErrorHandler.showWarning(validation.warnings.join('\n'));
        }

        // 正規表現を作成
        const regex = RegexValidator.createRegex(params.searchPattern);

        // ファイル検索を実行（progressとtokenを渡す）
        const files = await this.performFileSearch(params, regex, options, searchId, progress, token);
        
        const searchTime = Date.now() - startTime;
        const result: SearchResult = {
          files,
          totalCount: files.length,
          searchTime,
          pattern: params.searchPattern
        };
        
        return {
          success: true as const,
          data: result
        };

      } catch (error) {
        const searchError = error instanceof SearchError 
          ? error 
          : new SearchError(ERROR_MESSAGES.SEARCH_FAILED, error instanceof Error ? error : new Error(ERROR_MESSAGES.UNKNOWN_ERROR));
        
        return {
          success: false as const,
          error: searchError
        };
      } finally {
        this._isSearching = false;
        this._currentSearchId = null;
      }
    });
  }

  /**
   * ファイル検索の実際の処理
   */
  private async performFileSearch(
    params: SearchParams,
    regex: RegExp,
    options: SearchOptions,
    searchId: string,
    progress: vscode.Progress<{ message?: string; increment?: number }>,
    token: vscode.CancellationToken
  ): Promise<vscode.Uri[]> {
    const batchSize = options.batchSize || 100;
    const maxResults = options.maxResults || 10000;
    const showProgress = options.showProgress !== false;

    // グロブパターンでファイル取得
    const includeGlob = this.buildIncludeGlob(params.includeFolders);
    const excludeGlob = this.buildExcludeGlob(params.excludeFolders);
    
    const allFiles = await vscode.workspace.findFiles(includeGlob, excludeGlob);

    if (allFiles.length === 0) {
      return [];
    }

    // バッチ処理でフィルタリング
    const matchedFiles: vscode.Uri[] = [];
    const totalBatches = Math.ceil(allFiles.length / batchSize);

    for (let i = 0; i < allFiles.length; i += batchSize) {
      // キャンセルチェック
      if (token.isCancellationRequested || this._currentSearchId !== searchId) {
        throw new SearchError(ERROR_MESSAGES.CANCELLED);
      }

      const batch = allFiles.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;

      // 進捗表示（直接progress.reportを使用）
      if (showProgress) {
        const percentage = Math.round((i / allFiles.length) * 100);
        progress.report({
          message: `ファイルを検索中... (${matchedFiles.length}件見つかりました)`,
          increment: percentage
        });
      }

      // バッチ内でフィルタリング
      const batchMatches = batch.filter(file => {
        const fileName = path.basename(file.fsPath);
        return regex.test(fileName);
      });

      matchedFiles.push(...batchMatches);

      // 最大結果数に達した場合は終了
      if (matchedFiles.length >= maxResults) {
        break;
      }

      // UIをブロックしないように次のイベントループに制御を譲る
      if (i + batchSize < allFiles.length) {
        await new Promise(resolve => setImmediate(resolve));
      }
    }

    return matchedFiles;
  }


  /**
   * 含むフォルダのグロブパターンを構築
   */
  private buildIncludeGlob(includeFolders: string[]): string {
    if (!includeFolders || includeFolders.length === 0) {
      return '**/*';
    }
    
    // VS Codeのグロブパターン形式: {pattern1,pattern2,pattern3}
    const patterns = includeFolders.map(folder => folder.trim()).filter(folder => folder.length > 0);
    if (patterns.length === 0) {
      return '**/*';
    }
    
    if (patterns.length === 1) {
      return patterns[0];
    }
    
    return `{${patterns.join(',')}}`;
  }

  /**
   * 含まないフォルダのグロブパターンを構築
   */
  private buildExcludeGlob(excludeFolders: string[]): string | null {
    if (!excludeFolders || excludeFolders.length === 0) {
      return null; // VS Codeのデフォルト除外設定を使用
    }
    
    const patterns = excludeFolders.map(folder => folder.trim()).filter(folder => folder.length > 0);
    if (patterns.length === 0) {
      return null;
    }
    
    if (patterns.length === 1) {
      return patterns[0];
    }
    
    return `{${patterns.join(',')}}`;
  }

  /**
   * 検索IDを生成
   */
  private generateSearchId(): string {
    return `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }


  /**
   * リソースをクリーンアップ
   */
  dispose(): void {
    this._currentSearchId = null;
    this._isSearching = false;
    this._disposables.forEach(disposable => disposable.dispose());
    this._disposables.length = 0;
  }
}

