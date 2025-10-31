import * as vscode from 'vscode';
import {
  ConfigError,
  RegexError,
  RenameError,
  SearchError,
} from './errorHandler';

/**
 * ログレベル定義
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

/**
 * 統一的なログ出力機能
 * VS Code OutputChannelとコンソールの両方にログを出力します
 */
export class Logger implements vscode.Disposable {
  private static instance?: Logger;
  private static extensionContext?: vscode.ExtensionContext;
  private outputChannel: vscode.OutputChannel;
  private cachedLogLevel: LogLevel | null = null;
  private cachedLogFileEnabled: boolean | null = null;
  private cachedLogFileDirectory: string | null = null;
  private configWatcher?: vscode.Disposable;
  private readonly outputChannelName = 'Regex File Finder';

  private constructor() {
    this.outputChannel = vscode.window.createOutputChannel(
      this.outputChannelName
    );
    this.setupConfigWatcher();
  }

  /**
   * ExtensionContextを設定して初期化
   */
  static initialize(context: vscode.ExtensionContext): void {
    Logger.extensionContext = context;
  }

  /**
   * インスタンスを取得（シングルトン）
   */
  static getInstance(): Logger | undefined {
    if (!Logger.instance) {
      try {
        Logger.instance = new Logger();
      } catch (error) {
        // Loggerの初期化に失敗した場合はconsole.errorにフォールバック
        console.error('[Logger] 初期化エラー:', error);
        return undefined;
      }
    }
    return Logger.instance;
  }

  /**
   * 非ErrorオブジェクトをErrorに変換（静的メソッド版）
   */
  private static ensureError(error: Error | string | unknown): Error {
    if (error instanceof Error) {
      return error;
    }

    if (typeof error === 'string') {
      return new Error(error);
    }

    return new Error(String(error));
  }

  /**
   * エラーログを出力
   */
  static logError(error: Error | string | unknown, context?: string): void {
    try {
      const instance = Logger.getInstance();
      if (!instance) {
        // Loggerが利用できない場合はconsole.errorにフォールバック
        const errorObj = Logger.ensureError(error);
        if (context) {
          console.error(`[${context}] エラー:`, errorObj);
        } else {
          console.error('エラー:', errorObj);
        }
        return;
      }
      instance._logError(instance.ensureError(error), context);
    } catch (logError) {
      // Logger内でエラーが発生した場合はconsole.errorにフォールバック
      console.error('[Logger] logErrorエラー:', logError);
      try {
        const errorObj = Logger.ensureError(error);
        if (context) {
          console.error(`[${context}] エラー:`, errorObj);
        } else {
          console.error('エラー:', errorObj);
        }
      } catch {
        // フォールバックも失敗した場合は無視
      }
    }
  }

  /**
   * 警告ログを出力
   */
  static logWarning(message: string, context?: string): void {
    try {
      const instance = Logger.getInstance();
      if (!instance) {
        console.warn(
          context ? `[${context}] 警告: ${message}` : `警告: ${message}`
        );
        return;
      }
      instance._logWarning(message, context);
    } catch (error) {
      // Logger内でエラーが発生した場合はconsole.warnにフォールバック
      console.warn('[Logger] logWarningエラー:', error);
      console.warn(
        context ? `[${context}] 警告: ${message}` : `警告: ${message}`
      );
    }
  }

  /**
   * 情報ログを出力
   */
  static logInfo(message: string, context?: string): void {
    try {
      const instance = Logger.getInstance();
      if (!instance) {
        console.info(
          context ? `[${context}] 情報: ${message}` : `情報: ${message}`
        );
        return;
      }
      instance._logInfo(message, context);
    } catch (error) {
      // Logger内でエラーが発生した場合はconsole.infoにフォールバック
      console.info('[Logger] logInfoエラー:', error);
      console.info(
        context ? `[${context}] 情報: ${message}` : `情報: ${message}`
      );
    }
  }

  /**
   * デバッグログを出力
   */
  static logDebug(message: string, context?: string): void {
    try {
      const instance = Logger.getInstance();
      if (!instance) {
        console.debug(
          context ? `[${context}] デバッグ: ${message}` : `デバッグ: ${message}`
        );
        return;
      }
      instance._logDebug(message, context);
    } catch (error) {
      // Logger内でエラーが発生した場合はconsole.debugにフォールバック
      console.debug('[Logger] logDebugエラー:', error);
      console.debug(
        context ? `[${context}] デバッグ: ${message}` : `デバッグ: ${message}`
      );
    }
  }

  /**
   * エラーログを出力（インスタンスメソッド）
   */
  private _logError(error: Error, context?: string): void {
    if (!this.shouldLog(LogLevel.ERROR)) {
      return;
    }

    const message = error.message || 'エラーが発生しました';

    this.logToConsole('ERROR', message, error, context);
    this.logToOutputChannel('ERROR', message, error, context);

    // ログファイルに出力
    this.logToFile('ERROR', message, error, context).catch((fileError) => {
      // ログファイルへの書き込みに失敗した場合はエラーログを出力
      console.error('[Logger] ログファイル出力エラー:', fileError);
    });

    // ERRORレベルの場合はOutputChannelを自動表示
    this.outputChannel.show(true);
  }

  /**
   * 警告ログを出力（インスタンスメソッド）
   */
  private _logWarning(message: string, context?: string): void {
    if (!this.shouldLog(LogLevel.WARN)) {
      return;
    }

    this.logToConsole('WARN', message, undefined, context);
    this.logToOutputChannel('WARN', message, undefined, context);

    // ログファイルに出力
    this.logToFile('WARN', message, undefined, context).catch((fileError) => {
      // ログファイルへの書き込みに失敗した場合はエラーログを出力
      console.error('[Logger] ログファイル出力エラー:', fileError);
    });
  }

  /**
   * 情報ログを出力（インスタンスメソッド）
   */
  private _logInfo(message: string, context?: string): void {
    if (!this.shouldLog(LogLevel.INFO)) {
      return;
    }

    this.logToConsole('INFO', message, undefined, context);
    this.logToOutputChannel('INFO', message, undefined, context);

    // ログファイルに出力
    this.logToFile('INFO', message, undefined, context).catch((fileError) => {
      // ログファイルへの書き込みに失敗した場合はエラーログを出力
      console.error('[Logger] ログファイル出力エラー:', fileError);
    });
  }

  /**
   * デバッグログを出力（インスタンスメソッド）
   */
  private _logDebug(message: string, context?: string): void {
    if (!this.shouldLog(LogLevel.DEBUG)) {
      return;
    }

    this.logToConsole('DEBUG', message, undefined, context);
    this.logToOutputChannel('DEBUG', message, undefined, context);

    // ログファイルに出力
    this.logToFile('DEBUG', message, undefined, context).catch((fileError) => {
      // ログファイルへの書き込みに失敗した場合はエラーログを出力
      console.error('[Logger] ログファイル出力エラー:', fileError);
    });
  }

  /**
   * 現在のログレベルを取得（キャッシュから読み込み、なければVS Code設定から）
   */
  private getCurrentLogLevel(): LogLevel {
    if (this.cachedLogLevel !== null) {
      return this.cachedLogLevel;
    }

    try {
      const config = vscode.workspace.getConfiguration('regexFileFinder');
      const levelStr = config.get<string>('logLevel', 'INFO');

      switch (levelStr.toUpperCase()) {
        case 'DEBUG':
          this.cachedLogLevel = LogLevel.DEBUG;
          break;
        case 'INFO':
          this.cachedLogLevel = LogLevel.INFO;
          break;
        case 'WARN':
          this.cachedLogLevel = LogLevel.WARN;
          break;
        case 'ERROR':
          this.cachedLogLevel = LogLevel.ERROR;
          break;
        default:
          this.cachedLogLevel = LogLevel.INFO;
      }
    } catch (error) {
      // 設定読み込みに失敗した場合はデフォルト値を使用
      console.error('[Logger] ログレベル設定読み込みエラー:', error);
      this.cachedLogLevel = LogLevel.INFO;
    }

    return this.cachedLogLevel;
  }

  /**
   * ログレベルキャッシュを無効化（設定変更時に呼び出す）
   */
  private invalidateLogLevelCache(): void {
    this.cachedLogLevel = null;
  }

  /**
   * ログファイル設定のキャッシュを無効化（設定変更時に呼び出す）
   */
  private invalidateLogFileCache(): void {
    this.cachedLogFileEnabled = null;
    this.cachedLogFileDirectory = null;
  }

  /**
   * 設定変更監視をセットアップ
   */
  private setupConfigWatcher(): void {
    try {
      this.configWatcher = vscode.workspace.onDidChangeConfiguration(
        (event) => {
          if (event.affectsConfiguration('regexFileFinder.logLevel')) {
            this.invalidateLogLevelCache();
          }
          if (
            event.affectsConfiguration('regexFileFinder.logFileEnabled') ||
            event.affectsConfiguration('regexFileFinder.logFileDirectory')
          ) {
            this.invalidateLogFileCache();
          }
        }
      );
    } catch (error) {
      console.error('[Logger] 設定監視セットアップエラー:', error);
    }
  }

  /**
   * 指定されたログレベルでログを出力すべきか判定
   */
  private shouldLog(level: LogLevel): boolean {
    const currentLevel = this.getCurrentLogLevel();
    return level >= currentLevel;
  }

  /**
   * 時刻フォーマット（YYYY-MM-DD HH:mm:ss）
   */
  private formatTimestamp(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

  /**
   * ログメッセージをフォーマット
   */
  private formatLogMessage(
    level: string,
    message: string,
    context?: string
  ): string {
    const timestamp = this.formatTimestamp();
    const contextPart = context ? `[${context}]` : '';
    return `[${timestamp}] [${level}] ${contextPart ? `${contextPart} ` : ''}${message}`;
  }

  /**
   * OutputChannelにログを出力
   */
  private logToOutputChannel(
    level: string,
    message: string,
    error?: Error,
    context?: string
  ): void {
    try {
      const formattedMessage = this.formatLogMessage(level, message, context);
      this.outputChannel.appendLine(formattedMessage);

      // エラーの場合、追加情報を出力
      if (error) {
        const errorDetails = this.extractErrorDetails(error);

        if (error.stack) {
          this.outputChannel.appendLine(`Stack: ${error.stack}`);
        }

        // カスタムエラーの追加情報を出力
        if (Object.keys(errorDetails).length > 0) {
          const detailsStr = Object.entries(errorDetails)
            .map(([key, value]) => {
              if (value instanceof vscode.Uri) {
                return `${key}: ${value.fsPath}`;
              }
              return `${key}: ${String(value)}`;
            })
            .join(', ');
          this.outputChannel.appendLine(`Details: ${detailsStr}`);
        }

        // causeがある場合（SearchError, ConfigError）
        if (error instanceof SearchError || error instanceof ConfigError) {
          if (error.cause) {
            this.outputChannel.appendLine(`Cause: ${error.cause.message}`);
            if (error.cause.stack) {
              this.outputChannel.appendLine(
                `Cause Stack: ${error.cause.stack}`
              );
            }
          }
        }
      }
    } catch (error) {
      // OutputChannelへの出力に失敗した場合はconsole.errorにフォールバック
      console.error('[Logger] OutputChannel出力エラー:', error);
    }
  }

  /**
   * コンソールにログを出力
   */
  private logToConsole(
    level: string,
    message: string,
    error?: Error,
    context?: string
  ): void {
    try {
      const formattedMessage = this.formatLogMessage(level, message, context);

      // 構造化されたオブジェクトと整形された文字列の両方を出力
      const logData: Record<string, unknown> = {
        timestamp: this.formatTimestamp(),
        level,
        context,
        message,
      };

      if (error) {
        logData.name = error.name;
        logData.message = error.message;
        logData.stack = error.stack;

        // カスタムエラーの追加情報を追加
        const errorDetails = this.extractErrorDetails(error);
        Object.assign(logData, errorDetails);
      }

      // ログレベルに応じたコンソールメソッドを呼び出し
      switch (level) {
        case 'ERROR':
          console.error(formattedMessage, logData);
          break;
        case 'WARN':
          console.warn(formattedMessage, logData);
          break;
        case 'INFO':
          console.info(formattedMessage, logData);
          break;
        case 'DEBUG':
          console.debug(formattedMessage, logData);
          break;
        default:
          console.log(formattedMessage, logData);
      }
    } catch (error) {
      // コンソール出力に失敗した場合は無視（無限ループを防ぐ）
      console.error('[Logger] コンソール出力エラー:', error);
    }
  }

  /**
   * カスタムエラーの追加情報を抽出
   */
  private extractErrorDetails(error: Error): Record<string, unknown> {
    const details: Record<string, unknown> = {};

    try {
      // RegexError: patternプロパティ
      if (error instanceof RegexError) {
        details.pattern = error.pattern;
      }

      // RenameError: fileUriプロパティ
      if (error instanceof RenameError && error.fileUri) {
        details.fileUri = error.fileUri;
      }

      // SearchError/ConfigError: causeプロパティ（Errorオブジェクトの場合）
      if (
        (error instanceof SearchError || error instanceof ConfigError) &&
        error.cause instanceof Error
      ) {
        details.cause = {
          name: error.cause.name,
          message: error.cause.message,
          stack: error.cause.stack,
        };
      }
    } catch {
      // エラー詳細の抽出に失敗した場合は無視
    }

    return details;
  }

  /**
   * 非ErrorオブジェクトをErrorに変換
   */
  private ensureError(error: Error | string | unknown): Error {
    if (error instanceof Error) {
      return error;
    }

    if (typeof error === 'string') {
      return new Error(error);
    }

    return new Error(String(error));
  }

  /**
   * ログファイルへの出力が必要か判定
   */
  private shouldLogToFile(): boolean {
    if (this.cachedLogFileEnabled !== null) {
      return this.cachedLogFileEnabled;
    }

    try {
      const config = vscode.workspace.getConfiguration('regexFileFinder');
      this.cachedLogFileEnabled = config.get<boolean>('logFileEnabled', false);
    } catch (error) {
      // 設定読み込みに失敗した場合はデフォルト値を使用
      console.error('[Logger] ログファイル設定読み込みエラー:', error);
      this.cachedLogFileEnabled = false;
    }

    return this.cachedLogFileEnabled;
  }

  /**
   * ログファイルのディレクトリパスを取得
   */
  private getLogFileDirectory(): string {
    if (this.cachedLogFileDirectory !== null) {
      return this.cachedLogFileDirectory;
    }

    try {
      const config = vscode.workspace.getConfiguration('regexFileFinder');
      const directory = config.get<string>('logFileDirectory', '');

      // 空の場合はExtensionContextのlogPathを使用
      if (!directory || directory.trim() === '') {
        if (Logger.extensionContext && Logger.extensionContext.logPath) {
          // logPathはvscode.Uri型
          const logPath = Logger.extensionContext
            .logPath as unknown as vscode.Uri;
          this.cachedLogFileDirectory = logPath.fsPath;
        } else {
          // ExtensionContextがない場合はデフォルトディレクトリを使用できないので空文字列
          this.cachedLogFileDirectory = '';
        }
      } else {
        this.cachedLogFileDirectory = directory.trim();
      }
    } catch (error) {
      // 設定読み込みに失敗した場合はデフォルト値を使用
      console.error(
        '[Logger] ログファイルディレクトリ設定読み込みエラー:',
        error
      );
      if (Logger.extensionContext && Logger.extensionContext.logPath) {
        // logPathはvscode.Uri型
        const logPath = Logger.extensionContext
          .logPath as unknown as vscode.Uri;
        this.cachedLogFileDirectory = logPath.fsPath;
      } else {
        this.cachedLogFileDirectory = '';
      }
    }

    return this.cachedLogFileDirectory || '';
  }

  /**
   * ログディレクトリの存在確認と作成
   */
  private async ensureLogDirectoryExists(directory: string): Promise<void> {
    if (!directory || directory.trim() === '') {
      return;
    }

    try {
      const dirUri = vscode.Uri.file(directory);

      // ディレクトリの存在確認
      try {
        const stat = await vscode.workspace.fs.stat(dirUri);
        if (stat.type === vscode.FileType.Directory) {
          return; // ディレクトリが存在する
        }
      } catch {
        // ディレクトリが存在しない場合は作成
      }

      // ディレクトリを作成（親ディレクトリも含めて）
      await vscode.workspace.fs.createDirectory(dirUri);
    } catch (error) {
      // ディレクトリの作成に失敗した場合はエラーをスロー
      throw new Error(
        `ログディレクトリの作成に失敗しました: ${directory} (${error instanceof Error ? error.message : String(error)})`
      );
    }
  }

  /**
   * ログファイル名を生成（日付ベース）
   */
  private getLogFileName(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    return `regex-file-finder-${year}-${month}-${day}.log`;
  }

  /**
   * ログファイルに出力
   */
  private async logToFile(
    level: string,
    message: string,
    error?: Error,
    context?: string
  ): Promise<void> {
    // ログファイル出力が無効な場合はスキップ
    if (!this.shouldLogToFile()) {
      return;
    }

    const directory = this.getLogFileDirectory();
    if (!directory || directory.trim() === '') {
      return; // ディレクトリが設定されていない場合はスキップ
    }

    // ディレクトリの存在確認と作成
    await this.ensureLogDirectoryExists(directory);

    // ログファイルのパス
    const fileName = this.getLogFileName();
    const filePath = `${directory}/${fileName}`;
    const fileUri = vscode.Uri.file(filePath);

    // ログエントリを構築
    const formattedMessage = this.formatLogMessage(level, message, context);
    let logEntry = formattedMessage + '\n';

    // エラーの場合、追加情報を出力
    if (error) {
      const errorDetails = this.extractErrorDetails(error);

      if (error.stack) {
        logEntry += `Stack: ${error.stack}\n`;
      }

      // カスタムエラーの追加情報を出力
      if (Object.keys(errorDetails).length > 0) {
        const detailsStr = Object.entries(errorDetails)
          .map(([key, value]) => {
            if (value instanceof vscode.Uri) {
              return `${key}: ${value.fsPath}`;
            }
            return `${key}: ${String(value)}`;
          })
          .join(', ');
        logEntry += `Details: ${detailsStr}\n`;
      }

      // causeがある場合（SearchError, ConfigError）
      if (error instanceof SearchError || error instanceof ConfigError) {
        if (error.cause) {
          logEntry += `Cause: ${error.cause.message}\n`;
          if (error.cause.stack) {
            logEntry += `Cause Stack: ${error.cause.stack}\n`;
          }
        }
      }
    }

    // 既存のファイルがある場合は読み込んでから追記
    try {
      const existingContent = await vscode.workspace.fs.readFile(fileUri);
      const existingText = Buffer.from(existingContent).toString('utf-8');
      const newContent = Buffer.from(existingText + logEntry, 'utf-8');
      await vscode.workspace.fs.writeFile(fileUri, newContent);
    } catch {
      // ファイルが存在しない場合は新規作成
      const newContent = Buffer.from(logEntry, 'utf-8');
      await vscode.workspace.fs.writeFile(fileUri, newContent);
    }
  }

  /**
   * リソースをクリーンアップ
   */
  dispose(): void {
    try {
      if (this.configWatcher) {
        this.configWatcher.dispose();
        this.configWatcher = undefined;
      }
      this.outputChannel.dispose();
      Logger.instance = undefined;
    } catch (error) {
      console.error('[Logger] disposeエラー:', error);
    }
  }
}
