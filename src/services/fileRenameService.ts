import * as path from 'path';
import * as vscode from 'vscode';
import {
  RenameHistory,
  RenamePreview,
  RenameResult,
  RenameValidationResult,
} from '../types';
import { ERROR_MESSAGES, RenameError } from './errorHandler';

/**
 * ファイル名置き換えサービス
 */
export class FileRenameService implements vscode.Disposable {
  private readonly _disposables: vscode.Disposable[] = [];
  private _undoHistory: RenameHistory[] = [];
  private _redoHistory: RenameHistory[] = [];
  private readonly _maxHistorySize = 10;

  /**
   * 置き換えプレビューを生成
   */
  previewRename(
    files: vscode.Uri[],
    searchPattern: string,
    replacement: string
  ): RenamePreview[] {
    if (!searchPattern || searchPattern.trim() === '') {
      return [];
    }

    const regex = new RegExp(searchPattern);
    const previews: RenamePreview[] = [];

    for (const file of files) {
      const fileName = path.basename(file.fsPath);
      const fileDir = path.dirname(file.fsPath);

      // ファイル名に正規表現を適用して新しいファイル名を生成
      const newFileName = fileName.replace(regex, replacement);

      // 置換が発生しなかった場合（パターンにマッチしない）はスキップ
      if (newFileName === fileName) {
        continue;
      }

      // 新しいパスを生成
      const newPath = this.generateNewFilePath(fileDir, newFileName);
      const newUri = vscode.Uri.file(newPath);

      previews.push({
        oldUri: file,
        newUri,
        oldFileName: fileName,
        newFileName,
        oldPath: file.fsPath,
        newPath,
        needsDirectoryMove: file.fsPath !== newPath,
      });
    }

    return previews;
  }

  /**
   * 新しいファイルパスを生成
   */
  private generateNewFilePath(directory: string, newFileName: string): string {
    // ファイル名にパス区切り文字が含まれる場合（例: sub/file.ts）
    if (newFileName.includes('/')) {
      const parts = newFileName.split('/');
      const fileName = parts.pop();
      const subDirs = parts.join('/');

      // サブディレクトリを含めたパスを生成
      return path.join(directory, subDirs, fileName || '');
    }

    // 通常のファイル名変更
    return path.join(directory, newFileName);
  }

  /**
   * 置き換えの検証
   */
  async validateRename(
    previews: RenamePreview[]
  ): Promise<RenameValidationResult> {
    const warnings: string[] = [];
    const duplicateFiles: RenamePreview[] = [];
    const directoriesToCreate: vscode.Uri[] = [];

    // 重複チェック
    const newPathsSet = new Set<string>();
    for (const preview of previews) {
      if (newPathsSet.has(preview.newPath)) {
        duplicateFiles.push(preview);
      } else {
        newPathsSet.add(preview.newPath);
      }
    }

    if (duplicateFiles.length > 0) {
      warnings.push(`${duplicateFiles.length}件のファイルが同名になります。`);
    }

    // 無効なファイル名チェック
    const invalidFiles: RenamePreview[] = [];
    for (const preview of previews) {
      if (!this.isValidFileName(preview.newFileName)) {
        invalidFiles.push(preview);
      }
    }

    if (invalidFiles.length > 0) {
      return {
        isValid: false,
        error: `${invalidFiles.length}件のファイル名が無効です。`,
        warnings,
        duplicateFiles,
        directoriesToCreate,
      };
    }

    // 既存ファイルとの衝突チェック
    const conflictingFiles: RenamePreview[] = [];
    for (const preview of previews) {
      try {
        const stat = await vscode.workspace.fs.stat(preview.newUri);
        if (stat) {
          conflictingFiles.push(preview);
        }
      } catch {
        // ファイルが存在しない場合は正常（新規作成の可能性）
      }
    }

    if (conflictingFiles.length > 0) {
      warnings.push(`${conflictingFiles.length}件のファイルが既に存在します。`);
    }

    // 作成が必要なディレクトリを収集
    for (const preview of previews) {
      if (preview.needsDirectoryMove) {
        const newDir = path.dirname(preview.newPath);
        const dirUri = vscode.Uri.file(newDir);

        try {
          await vscode.workspace.fs.stat(dirUri);
        } catch {
          // ディレクトリが存在しない場合は作成が必要
          if (!directoriesToCreate.some((d) => d.fsPath === dirUri.fsPath)) {
            directoriesToCreate.push(dirUri);
          }
        }
      }
    }

    return {
      isValid: true,
      warnings: warnings.length > 0 ? warnings : undefined,
      duplicateFiles: duplicateFiles.length > 0 ? duplicateFiles : undefined,
      directoriesToCreate:
        directoriesToCreate.length > 0 ? directoriesToCreate : undefined,
    };
  }

  /**
   * ファイル名が有効かチェック
   */
  private isValidFileName(fileName: string): boolean {
    // 空文字列は無効
    if (!fileName || fileName.trim() === '') {
      return false;
    }

    // Windows/Linux/macOS の予約文字
    // eslint-disable-next-line no-control-regex
    const invalidChars = /[<>:"|?*\x00-\x1f]/;
    if (invalidChars.test(fileName)) {
      return false;
    }

    // Windowsの予約名
    const reservedNames = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\.|$)/i;
    if (reservedNames.test(fileName)) {
      return false;
    }

    // 末尾が空白やドットは無効
    if (fileName.endsWith('.') || fileName.endsWith(' ')) {
      return false;
    }

    return true;
  }

  /**
   * ディレクトリの存在確認と作成
   */
  private async ensureDirectoryExists(dirUri: vscode.Uri): Promise<void> {
    try {
      await vscode.workspace.fs.stat(dirUri);
    } catch {
      // ディレクトリが存在しない場合は作成
      await vscode.workspace.fs.createDirectory(dirUri);
    }
  }

  /**
   * ファイル名の置き換えを実行
   */
  async executeRename(previews: RenamePreview[]): Promise<RenameResult> {
    if (previews.length === 0) {
      return { successCount: 0, failureCount: 0 };
    }

    const errors: Array<{ file: vscode.Uri; error: string }> = [];
    let successCount = 0;

    // 作成が必要なディレクトリを事前に作成
    const dirsToCreate = new Set<string>();
    for (const preview of previews) {
      if (preview.needsDirectoryMove) {
        const newDir = path.dirname(preview.newPath);
        dirsToCreate.add(newDir);
      }
    }

    for (const dir of dirsToCreate) {
      try {
        const dirUri = vscode.Uri.file(dir);
        await this.ensureDirectoryExists(dirUri);
      } catch (dirError) {
        errors.push({
          file: previews[0].oldUri, // エラーが発生したディレクトリ内の最初のファイル
          error: `ディレクトリの作成に失敗しました: ${dir}${dirError instanceof Error ? ` (${dirError.message})` : ''}`,
        });
        return { successCount: 0, failureCount: previews.length, errors };
      }
    }

    // ファイル名の置き換えを実行
    const fileMapping: Array<{ from: vscode.Uri; to: vscode.Uri }> = [];

    for (const preview of previews) {
      try {
        await vscode.workspace.fs.rename(preview.oldUri, preview.newUri, {
          overwrite: false,
        });
        fileMapping.push({ from: preview.oldUri, to: preview.newUri });
        successCount++;
      } catch (error) {
        errors.push({
          file: preview.oldUri,
          error:
            error instanceof Error
              ? error.message
              : '不明なエラーが発生しました',
        });
      }
    }

    // 履歴に追加
    if (fileMapping.length > 0) {
      const history: RenameHistory = {
        fileMapping,
        timestamp: Date.now(),
      };
      this.addToHistory(history);
    }

    return {
      successCount,
      failureCount: previews.length - successCount,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * 履歴に追加
   */
  private addToHistory(history: RenameHistory): void {
    this._undoHistory.push(history);

    // 履歴が最大サイズを超えた場合は古いものを削除
    if (this._undoHistory.length > this._maxHistorySize) {
      this._undoHistory.shift();
    }

    // Redo履歴をクリア（新しい操作が行われたため）
    this._redoHistory = [];
  }

  /**
   * Undo可能かチェック
   */
  canUndo(): boolean {
    return this._undoHistory.length > 0;
  }

  /**
   * Redo可能かチェック
   */
  canRedo(): boolean {
    return this._redoHistory.length > 0;
  }

  /**
   * 最後の置き換えを元に戻す
   */
  async undo(): Promise<RenameResult> {
    if (!this.canUndo()) {
      throw new RenameError(ERROR_MESSAGES.NO_UNDO_HISTORY);
    }

    const lastHistory = this._undoHistory.pop()!;
    const errors: Array<{ file: vscode.Uri; error: string }> = [];
    let successCount = 0;

    // 逆順に元に戻す
    for (const { from, to } of lastHistory.fileMapping.reverse()) {
      try {
        await vscode.workspace.fs.rename(to, from, { overwrite: false });
        successCount++;
      } catch (error) {
        errors.push({
          file: to,
          error:
            error instanceof Error
              ? error.message
              : '不明なエラーが発生しました',
        });
      }
    }

    // Redo履歴に追加
    this._redoHistory.push(lastHistory);

    return {
      successCount,
      failureCount: lastHistory.fileMapping.length - successCount,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * やり直す
   */
  async redo(): Promise<RenameResult> {
    if (!this.canRedo()) {
      throw new RenameError(ERROR_MESSAGES.NO_REDO_HISTORY);
    }

    const lastHistory = this._redoHistory.pop()!;
    const errors: Array<{ file: vscode.Uri; error: string }> = [];
    let successCount = 0;

    // 再度実行
    for (const { from, to } of lastHistory.fileMapping) {
      try {
        await vscode.workspace.fs.rename(from, to, { overwrite: false });
        successCount++;
      } catch (error) {
        errors.push({
          file: from,
          error:
            error instanceof Error
              ? error.message
              : '不明なエラーが発生しました',
        });
      }
    }

    // Undo履歴に追加
    this._undoHistory.push(lastHistory);

    return {
      successCount,
      failureCount: lastHistory.fileMapping.length - successCount,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * リソースをクリーンアップ
   */
  dispose(): void {
    this._undoHistory = [];
    this._redoHistory = [];
    this._disposables.forEach((disposable) => disposable.dispose());
    this._disposables.length = 0;
  }
}
