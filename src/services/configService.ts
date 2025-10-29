import * as vscode from 'vscode';
import { SearchParams } from '../types';

/**
 * 検索パラメータの設定管理サービス
 */
export class ConfigService implements vscode.Disposable {
  private readonly _disposables: vscode.Disposable[] = [];
  private readonly _configKey = 'regexFileFinder';
  
  private _searchParams: SearchParams = {
    searchPattern: '',
    includePattern: '**/*',
    excludePattern: ''
  };

  constructor() {
    this.loadConfig();
    this.setupConfigWatcher();
  }

  /**
   * 検索パラメータを取得
   */
  get searchParams(): Readonly<SearchParams> {
    return { ...this._searchParams };
  }

  /**
   * 検索パターンを設定
   */
  async setSearchPattern(pattern: string): Promise<void> {
    this._searchParams.searchPattern = pattern;
    await this.saveConfig();
  }

  /**
   * 含めるファイルパターンを設定
   */
  async setIncludePattern(pattern: string): Promise<void> {
    this._searchParams.includePattern = pattern || '**/*';
    await this.saveConfig();
  }

  /**
   * 除外するファイルパターンを設定
   */
  async setExcludePattern(pattern: string): Promise<void> {
    this._searchParams.excludePattern = pattern;
    await this.saveConfig();
  }


  /**
   * 設定を保存
   */
  private async saveConfig(): Promise<void> {
    try {
      const config = vscode.workspace.getConfiguration(this._configKey);
      
      // ワークスペースが開かれている場合はワークスペース設定を優先、そうでなければグローバル設定を使用
      const target = vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0 
        ? vscode.ConfigurationTarget.Workspace 
        : vscode.ConfigurationTarget.Global;
      
      await config.update('searchPattern', this._searchParams.searchPattern, target);
      await config.update('includePattern', this._searchParams.includePattern, target);
      await config.update('excludePattern', this._searchParams.excludePattern, target);
    } catch (error) {
      console.error('[ConfigService] 設定保存エラー:', error);
      // 設定保存に失敗してもアプリケーションは継続動作させる
      // エラーを再スローしない
    }
  }

  /**
   * 設定を読み込み
   */
  private loadConfig(): void {
    try {
      const config = vscode.workspace.getConfiguration(this._configKey);
      this._searchParams = {
        searchPattern: config.get('searchPattern', ''),
        includePattern: config.get('includePattern', '**/*'),
        excludePattern: config.get('excludePattern', '')
      };
    } catch (error) {
      console.warn('[ConfigService] 設定読み込みエラー:', error);
      // デフォルト値を使用
      this._searchParams = {
        searchPattern: '',
        includePattern: '**/*',
        excludePattern: ''
      };
    }
  }

  /**
   * 設定変更の監視を設定
   */
  private setupConfigWatcher(): void {
    const disposable = vscode.workspace.onDidChangeConfiguration(event => {
      if (event.affectsConfiguration(this._configKey)) {
        this.loadConfig();
      }
    });
    this._disposables.push(disposable);
  }


  /**
   * リソースをクリーンアップ
   */
  dispose(): void {
    this._disposables.forEach(disposable => disposable.dispose());
    this._disposables.length = 0;
  }
}


