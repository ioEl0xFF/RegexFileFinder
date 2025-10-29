import * as vscode from 'vscode';
import { SearchParams } from '../types';
import { ConfigError, ERROR_MESSAGES } from './errorHandler';

/**
 * 検索パラメータの設定管理サービス
 */
export class ConfigService implements vscode.Disposable {
  private readonly _disposables: vscode.Disposable[] = [];
  private readonly _configKey = 'regexFileFinder';
  
  private _searchParams: SearchParams = {
    searchPattern: ''
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
    } catch (error) {
      console.error('[ConfigService] 設定保存エラー:', error);
      throw new ConfigError(ERROR_MESSAGES.CONFIG_SAVE_ERROR, error instanceof Error ? error : new Error(ERROR_MESSAGES.UNKNOWN_ERROR));
    }
  }

  /**
   * 設定を読み込み
   */
  private loadConfig(): void {
    try {
      const config = vscode.workspace.getConfiguration(this._configKey);
      this._searchParams = {
        searchPattern: config.get('searchPattern', '')
      };
    } catch (error) {
      console.warn('[ConfigService] 設定読み込みエラー:', error);
      // デフォルト値を使用（エラーを再スローしない）
      this._searchParams = {
        searchPattern: ''
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


