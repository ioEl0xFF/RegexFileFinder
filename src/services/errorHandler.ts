import * as vscode from 'vscode';

/**
 * カスタムエラークラス群
 */

/**
 * 正規表現関連のエラー
 */
export class RegexError extends Error {
  public readonly pattern: string;
  public readonly code = 'REGEX_ERROR';

  constructor(message: string, pattern: string) {
    super(message);
    this.name = 'RegexError';
    this.pattern = pattern;
  }
}

/**
 * 検索処理関連のエラー
 */
export class SearchError extends Error {
  public readonly code = 'SEARCH_ERROR';

  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = 'SearchError';
  }
}

/**
 * 設定関連のエラー
 */
export class ConfigError extends Error {
  public readonly code = 'CONFIG_ERROR';

  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = 'ConfigError';
  }
}


/**
 * 統一的なエラーハンドリング機能
 */
export class ErrorHandler {
  /**
   * エラーログを出力
   */
  static logError(error: Error, context?: string): void {
    const contextMessage = context ? `[${context}] ` : '';
    console.error(`${contextMessage}エラー:`, {
      name: error.name,
      message: error.message,
      stack: error.stack,
      ...(error instanceof RegexError && { pattern: error.pattern })
    });
  }

  /**
   * エラーメッセージをユーザーに表示
   */
  static async showError(error: Error, context?: string): Promise<void> {
    this.logError(error, context);

    let userMessage: string;
    
    if (error instanceof RegexError) {
      userMessage = `正規表現エラー: ${error.message}\n\n入力されたパターン: "${error.pattern}"\n\n例:\n• .*\\.tsx$ - TSXファイル\n• ^test.*\\.js$ - testで始まるJSファイル\n• .*component.* - "component"を含むファイル`;
    } else if (error instanceof SearchError) {
      userMessage = `検索エラー: ${error.message}`;
    } else if (error instanceof ConfigError) {
      userMessage = `設定エラー: ${error.message}`;
    } else if (error.name === 'Canceled') {
      // キャンセルエラーは表示しない
      return;
    } else {
      userMessage = `${ERROR_MESSAGES.UNKNOWN_ERROR}: ${error.message}`;
    }

    try {
      await vscode.window.showErrorMessage(userMessage);
    } catch (displayError) {
      // キャンセルエラーは無視（拡張機能終了時の正常な動作）
      if (displayError instanceof Error && displayError.name !== 'Canceled') {
        console.error('[ErrorHandler] エラー表示エラー:', displayError);
      }
    }
  }

  /**
   * 警告メッセージをユーザーに表示
   */
  static async showWarning(message: string): Promise<void> {
    try {
      console.warn(`警告: ${message}`);
      await vscode.window.showWarningMessage(message);
    } catch (error) {
      // キャンセルエラーは無視（拡張機能終了時の正常な動作）
      if (error instanceof Error && error.name !== 'Canceled') {
        console.error('[ErrorHandler] 警告表示エラー:', error);
      }
    }
  }

  /**
   * 情報メッセージをユーザーに表示
   */
  static async showInfo(message: string): Promise<void> {
    try {
      console.info(`情報: ${message}`);
      await vscode.window.showInformationMessage(message);
    } catch (error) {
      // キャンセルエラーは無視（拡張機能終了時の正常な動作）
      if (error instanceof Error && error.name !== 'Canceled') {
        console.error('[ErrorHandler] 情報表示エラー:', error);
      }
    }
  }

  /**
   * エラーを安全にキャッチして処理
   */
  static async handleAsync<T>(
    operation: () => Promise<T>,
    context?: string,
    fallback?: T
  ): Promise<T | undefined> {
    try {
      return await operation();
    } catch (error) {
      // キャンセルエラーは無視（拡張機能終了時の正常な動作）
      if (error instanceof Error && error.name === 'Canceled') {
        return fallback;
      }
      
      if (error instanceof Error) {
        await this.showError(error, context);
      } else {
        await this.showError(new Error('不明なエラーが発生しました'), context);
      }
      return fallback;
    }
  }

  /**
   * エラーを安全にキャッチして処理（同期的）
   */
  static handleSync<T>(
    operation: () => T,
    context?: string,
    fallback?: T
  ): T | undefined {
    try {
      return operation();
    } catch (error) {
      if (error instanceof Error) {
        this.logError(error, context);
        if (context) {
          vscode.window.showErrorMessage(`${context}: ${error.message}`);
        }
      }
      return fallback;
    }
  }
}

/**
 * エラーメッセージの定数
 */
export const ERROR_MESSAGES = {
  INVALID_REGEX: '無効な正規表現パターンです',
  EMPTY_PATTERN: '正規表現パターンを入力してください',
  WORKSPACE_NOT_OPEN: 'ワークスペースが開かれていません',
  SEARCH_FAILED: '検索に失敗しました',
  FILE_ACCESS_ERROR: 'ファイルアクセスエラーが発生しました',
  CONFIG_SAVE_ERROR: '設定の保存に失敗しました',
  CONFIG_LOAD_ERROR: '設定の読み込みに失敗しました',
  PATTERN_TOO_COMPLEX: '正規表現パターンが複雑すぎます',
  PATTERN_TOO_LONG: '正規表現パターンが長すぎます（1000文字以内）',
  DANGEROUS_PATTERN: 'パフォーマンス上の理由で、このパターンは使用できません',
  UNKNOWN_ERROR: '不明なエラーが発生しました',
  CANCELLED: '操作がキャンセルされました'
} as const;

/**
 * エラーコードの定数
 */
export const ERROR_CODES = {
  REGEX_ERROR: 'REGEX_ERROR',
  SEARCH_ERROR: 'SEARCH_ERROR',
  CONFIG_ERROR: 'CONFIG_ERROR'
} as const;
