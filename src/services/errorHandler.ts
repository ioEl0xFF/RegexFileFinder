import * as vscode from 'vscode';
import { Logger } from './logger';
import { t } from '../utils/i18n';

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

  constructor(
    message: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'SearchError';
  }
}

/**
 * 設定関連のエラー
 */
export class ConfigError extends Error {
  public readonly code = 'CONFIG_ERROR';

  constructor(
    message: string,
    public readonly cause?: Error
  ) {
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

  constructor(
    message: string,
    fileUri?: vscode.Uri,
    public readonly cause?: Error
  ) {
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
      userMessage = t('errors.regexError', error.message, error.pattern);
    } else if (error instanceof SearchError) {
      userMessage = t('errors.searchError', error.message);
    } else if (error instanceof ConfigError) {
      userMessage = t('errors.configError', error.message);
    } else if (error instanceof RenameError) {
      userMessage = t('errors.renameError', error.message);
    } else if (error.name === 'Canceled') {
      // キャンセルエラーは表示しない
      return;
    } else {
      userMessage = `${t('errors.unknownError')}: ${error.message}`;
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
        await this.showError(new Error(t('errors.unknownError')), context);
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
 * エラーメッセージの定数（翻訳キーへの移行のため、後方互換性のために残す）
 * @deprecated 代わりに t() 関数を使用してください
 */
export const ERROR_MESSAGES = {
  INVALID_REGEX: 'errors.invalidRegex',
  EMPTY_PATTERN: 'errors.emptyPattern',
  WORKSPACE_NOT_OPEN: 'errors.workspaceNotOpen',
  SEARCH_FAILED: 'errors.searchFailed',
  FILE_ACCESS_ERROR: 'errors.fileAccessError',
  CONFIG_SAVE_ERROR: 'errors.configSaveError',
  CONFIG_LOAD_ERROR: 'errors.configLoadError',
  PATTERN_TOO_COMPLEX: 'errors.patternTooComplex',
  PATTERN_TOO_LONG: 'errors.patternTooLong',
  DANGEROUS_PATTERN: 'errors.dangerousPattern',
  UNKNOWN_ERROR: 'errors.unknownError',
  CANCELLED: 'errors.cancelled',
  // ファイル名置き換え関連
  NO_REPLACEMENT_STRING: 'errors.noReplacementString',
  INVALID_FILE_NAME: 'errors.invalidFileName',
  DUPLICATE_FILE_NAME: 'errors.duplicateFileName',
  RENAME_FAILED: 'errors.renameFailed',
  DIRECTORY_CREATE_FAILED: 'errors.directoryCreateFailed',
  RENAME_VALIDATION_FAILED: 'errors.renameValidationFailed',
  UNDO_FAILED: 'errors.undoFailed',
  REDO_FAILED: 'errors.redoFailed',
  NO_UNDO_HISTORY: 'errors.noUndoHistory',
  NO_REDO_HISTORY: 'errors.noRedoHistory',
} as const;

/**
 * エラーコードの定数
 */
export const ERROR_CODES = {
  REGEX_ERROR: 'REGEX_ERROR',
  SEARCH_ERROR: 'SEARCH_ERROR',
  CONFIG_ERROR: 'CONFIG_ERROR',
  RENAME_ERROR: 'RENAME_ERROR',
} as const;
