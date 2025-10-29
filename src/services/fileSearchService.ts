import * as path from 'path';
import * as vscode from 'vscode';
import { PerformanceStats, ProgressInfo, Result, SearchOptions, SearchParams, SearchResult } from '../types';
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
    
    try {
      console.log('[FileSearchService] 検索開始:', { searchId, params, options });

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

      // ファイル検索を実行
      const files = await this.performFileSearch(params, regex, options, searchId);
      
      const searchTime = Date.now() - startTime;
      const result: SearchResult = {
        files,
        totalCount: files.length,
        searchTime,
        pattern: params.searchPattern
      };

      console.log(`[FileSearchService] 検索完了: ${files.length}件 (${searchTime}ms)`);
      
      return {
        success: true,
        data: result
      };

    } catch (error) {
      const searchError = error instanceof SearchError 
        ? error 
        : new SearchError(ERROR_MESSAGES.SEARCH_FAILED, error instanceof Error ? error : new Error('不明なエラー'));
      
      console.error('[FileSearchService] 検索エラー:', searchError);
      
      return {
        success: false,
        error: searchError
      };
    } finally {
      this._isSearching = false;
      this._currentSearchId = null;
    }
  }

  /**
   * ファイル検索の実際の処理
   */
  private async performFileSearch(
    params: SearchParams,
    regex: RegExp,
    options: SearchOptions,
    searchId: string
  ): Promise<vscode.Uri[]> {
    const batchSize = options.batchSize || 100;
    const maxResults = options.maxResults || 10000;
    const showProgress = options.showProgress !== false;

    // グロブパターンでファイル取得
    const includeGlob = params.includePattern || '**/*';
    const excludeGlob = params.excludePattern || null;
    
    console.log('[FileSearchService] グロブパターン - include:', includeGlob, 'exclude:', excludeGlob);
    
    const allFiles = await vscode.workspace.findFiles(includeGlob, excludeGlob);
    console.log(`[FileSearchService] 対象ファイル数: ${allFiles.length}`);

    if (allFiles.length === 0) {
      return [];
    }

    // バッチ処理でフィルタリング
    const matchedFiles: vscode.Uri[] = [];
    const totalBatches = Math.ceil(allFiles.length / batchSize);

    for (let i = 0; i < allFiles.length; i += batchSize) {
      // 検索がキャンセルされたかチェック
      if (this._currentSearchId !== searchId) {
        throw new SearchError('検索がキャンセルされました');
      }

      const batch = allFiles.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;

      // 進捗表示
      if (showProgress) {
        const progress: ProgressInfo = {
          current: batchNumber,
          total: totalBatches,
          message: `ファイルを検索中... (${matchedFiles.length}件見つかりました)`
        };
        await this.updateProgress(progress);
      }

      // バッチ内でフィルタリング
      const batchMatches = batch.filter(file => {
        const fileName = path.basename(file.fsPath);
        return regex.test(fileName);
      });

      matchedFiles.push(...batchMatches);

      // 最大結果数に達した場合は終了
      if (matchedFiles.length >= maxResults) {
        console.log(`[FileSearchService] 最大結果数 (${maxResults}) に達しました`);
        break;
      }

      // UIをブロックしないように次のイベントループに制御を譲る
      if (i + batchSize < allFiles.length) {
        await new Promise(resolve => setImmediate(resolve));
      }
    }

    console.log(`[FileSearchService] マッチ件数: ${matchedFiles.length}`);
    return matchedFiles;
  }

  /**
   * 進捗を更新
   */
  private async updateProgress(progress: ProgressInfo): Promise<void> {
    const percentage = Math.round((progress.current / progress.total) * 100);
    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: progress.message,
      cancellable: true
    }, async (progressToken, cancellationToken) => {
      progressToken.report({ increment: percentage });
      
      // キャンセルされた場合は検索を停止
      cancellationToken.onCancellationRequested(() => {
        this._currentSearchId = null;
      });
    });
  }

  /**
   * 検索IDを生成
   */
  private generateSearchId(): string {
    return `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 検索中かどうか
   */
  get isSearching(): boolean {
    return this._isSearching;
  }

  /**
   * 現在の検索をキャンセル
   */
  cancelSearch(): void {
    this._currentSearchId = null;
    this._isSearching = false;
  }

  /**
   * パフォーマンス統計を取得
   */
  getPerformanceStats(): PerformanceStats {
    return {
      searchTime: 0, // 実装時に更新
      fileCount: 0,  // 実装時に更新
      memoryUsage: process.memoryUsage().heapUsed,
      batchCount: 0  // 実装時に更新
    };
  }

  /**
   * リソースをクリーンアップ
   */
  dispose(): void {
    this.cancelSearch();
    this._disposables.forEach(disposable => disposable.dispose());
    this._disposables.length = 0;
  }
}

/**
 * 後方互換性のための関数（非推奨）
 * @deprecated FileSearchServiceクラスを使用してください
 */
export async function searchFiles(params: SearchParams): Promise<vscode.Uri[]> {
  const service = new FileSearchService();
  try {
    const result = await service.searchFiles(params);
    if (result.success) {
      return result.data.files;
    } else {
      throw result.error;
    }
  } finally {
    service.dispose();
  }
}
