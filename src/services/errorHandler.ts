import * as vscode from 'vscode';
import { Logger } from './logger';

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
 * ファイル名置き換え関連のエラー
 */
export class RenameError extends Error {
  public readonly code = 'RENAME_ERROR';
  public readonly fileUri?: vscode.Uri;

  constructor(message: string, fileUri?: vscode.Uri, public readonly cause?: Error) {
    super(message);
    this.name = 'RenameError';
    this.fileUri = fileUri;
  }
}


/**
 * 統一的なエラーハンドリング機能
 */
export class ErrorHandler {
  /**
   * エラーメッセージをユーザーに表示
   */
  static async showError(error: Error, context?: string): Promise<void> {
    Logger.logError(error, context);

    let userMessage: string;
    
    if (error instanceof RegexError) {
      userMessage = `正規表現エラー: ${error.message}\n\n入力されたパターン: "${error.pattern}"\n\n例:\n• .*\\.tsx$ - TSXファイル\n• ^test.*\\.js$ - testで始まるJSファイル\n• .*component.* - "component"を含むファイル`;
    } else if (error instanceof SearchError) {
      userMessage = `検索エラー: ${error.message}`;
    } else if (error instanceof ConfigError) {
      userMessage = `設定エラー: ${error.message}`;
    } else if (error instanceof RenameError) {
      userMessage = `ファイル名置き換えエラー: ${error.message}`;
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
        Logger.logError(displayError, 'ErrorHandler.showError');
      }
    }
  }

  /**
   * 警告メッセージをユーザーに表示
   */
  static async showWarning(message: string): Promise<void> {
    try {
      Logger.logWarning(message);
      await vscode.window.showWarningMessage(message);
    } catch (error) {
      // キャンセルエラーは無視（拡張機能終了時の正常な動作）
      if (error instanceof Error && error.name !== 'Canceled') {
        Logger.logError(error, 'ErrorHandler.showWarning');
      }
    }
  }

  /**
   * 情報メッセージをユーザーに表示
   */
  static async showInfo(message: string): Promise<void> {
    try {
      Logger.logInfo(message);
      await vscode.window.showInformationMessage(message);
    } catch (error) {
      // キャンセルエラーは無視（拡張機能終了時の正常な動作）
      if (error instanceof Error && error.name !== 'Canceled') {
        Logger.logError(error, 'ErrorHandler.showInfo');
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
        Logger.logError(error, context);
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
  CANCELLED: '操作がキャンセルされました',
  // ファイル名置き換え関連
  NO_REPLACEMENT_STRING: '置換文字列が入力されていません',
  INVALID_FILE_NAME: '無効なファイル名です',
  DUPLICATE_FILE_NAME: '同名のファイルが既に存在します',
  RENAME_FAILED: 'ファイル名の置き換えに失敗しました',
  DIRECTORY_CREATE_FAILED: 'ディレクトリの作成に失敗しました',
  RENAME_VALIDATION_FAILED: '置き換えの検証に失敗しました',
  UNDO_FAILED: 'Undo操作に失敗しました',
  REDO_FAILED: 'Redo操作に失敗しました',
  NO_UNDO_HISTORY: 'Undo履歴がありません',
  NO_REDO_HISTORY: 'Redo履歴がありません'
} as const;

/**
 * エラーコードの定数
 */
export const ERROR_CODES = {
  REGEX_ERROR: 'REGEX_ERROR',
  SEARCH_ERROR: 'SEARCH_ERROR',
  CONFIG_ERROR: 'CONFIG_ERROR',
  RENAME_ERROR: 'RENAME_ERROR'
} as const;
