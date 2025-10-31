import * as vscode from 'vscode';
import { SearchParams } from '../types';
import { t } from '../utils/i18n';
import { ConfigError, ERROR_MESSAGES } from './errorHandler';
import { Logger } from './logger';

/**
 * 検索パラメータの設定管理サービス
 */
export class ConfigService implements vscode.Disposable {
  private readonly _disposables: vscode.Disposable[] = [];
  private readonly _configKey = 'regexFileFinder';

  private _searchParams: SearchParams = {
    searchPattern: '',
    includeFolders: [],
    excludeFolders: [],
  };

  private _replacementString = '';

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
   * 含むフォルダを設定
   */
  async setIncludeFolders(folders: string[]): Promise<void> {
    this._searchParams.includeFolders = folders;
    await this.saveConfig();
  }

  /**
   * 含まないフォルダを設定
   */
  async setExcludeFolders(folders: string[]): Promise<void> {
    this._searchParams.excludeFolders = folders;
    await this.saveConfig();
  }

  /**
   * 置換文字列を取得
   */
  get replacementString(): string {
    return this._replacementString;
  }

  /**
   * 置換文字列を設定
   */
  async setReplacementString(replacement: string): Promise<void> {
    this._replacementString = replacement;
    await this.saveConfig();
  }

  /**
   * 設定を保存
   */
  private async saveConfig(): Promise<void> {
    try {
      const config = vscode.workspace.getConfiguration(this._configKey);

      // ワークスペースが開かれている場合はワークスペース設定を優先、そうでなければグローバル設定を使用
      const target =
        vscode.workspace.workspaceFolders &&
        vscode.workspace.workspaceFolders.length > 0
          ? vscode.ConfigurationTarget.Workspace
          : vscode.ConfigurationTarget.Global;

      await config.update(
        'searchPattern',
        this._searchParams.searchPattern,
        target
      );
      await config.update(
        'includeFolders',
        this._searchParams.includeFolders,
        target
      );
      await config.update(
        'excludeFolders',
        this._searchParams.excludeFolders,
        target
      );
      await config.update('replacementString', this._replacementString, target);
    } catch (error) {
      Logger.logError(
        error instanceof Error ? error : new Error(t('errors.unknownError')),
        'ConfigService.saveConfig'
      );
      throw new ConfigError(
        ERROR_MESSAGES.CONFIG_SAVE_ERROR,
        error instanceof Error ? error : new Error(t('errors.unknownError'))
      );
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
        includeFolders: config.get('includeFolders', []) || [],
        excludeFolders: config.get('excludeFolders', []) || [],
      };
      this._replacementString = config.get('replacementString', '');
    } catch (error) {
      Logger.logWarning('設定読み込みエラーが発生しました', 'ConfigService');
      Logger.logError(
        error instanceof Error ? error : new Error(String(error)),
        'ConfigService.loadConfig'
      );
      // デフォルト値を使用（エラーを再スローしない）
      this._searchParams = {
        searchPattern: '',
        includeFolders: [],
        excludeFolders: [],
      };
      this._replacementString = '';
    }
  }

  /**
   * 設定変更の監視を設定
   */
  private setupConfigWatcher(): void {
    const disposable = vscode.workspace.onDidChangeConfiguration((event) => {
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
    this._disposables.forEach((disposable) => disposable.dispose());
    this._disposables.length = 0;
  }
}
