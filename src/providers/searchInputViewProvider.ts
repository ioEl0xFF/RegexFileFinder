import * as vscode from 'vscode';
import { ConfigService } from '../services/configService';
import { ErrorHandler } from '../services/errorHandler';
import { FileRenameService } from '../services/fileRenameService';
import { Logger } from '../services/logger';
import { t } from '../utils/i18n';
import { RegexValidator } from '../utils/regexValidator';
import { SearchTreeProvider } from './searchTreeProvider';

/**
 * 検索条件入力用のWebviewViewProvider
 * サイドバーに検索パターン入力欄を表示し、入力時に自動検索を実行
 */
export class SearchInputViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewId = 'regexFileFinder.searchInput';

  private view?: vscode.WebviewView;
  private readonly config: ConfigService;
  private readonly renameService: FileRenameService;
  private readonly _disposables: vscode.Disposable[] = [];

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly treeProvider: SearchTreeProvider
  ) {
    this.config = new ConfigService();
    this.renameService = new FileRenameService();
    this._disposables.push(this.config, this.renameService);
  }

  /**
   * WebviewViewを解決
   */
  resolveWebviewView(webviewView: vscode.WebviewView): void {
    this.view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
    };

    const params = this.config.searchParams;
    webviewView.webview.html = this.getHtml(
      params.searchPattern,
      params.includeFolders.join(', '),
      params.excludeFolders.join(', '),
      this.config.replacementString
    );

    webviewView.webview.onDidReceiveMessage(async (message) => {
      try {
        // messageをログに残す
        Logger.logDebug(
          `受信メッセージ: ${JSON.stringify(message)}`,
          'SearchInputViewProvider'
        );
        switch (message.type) {
          case 'update':
            if (message.field === 'search') {
              const value = String(message.value ?? '');

              // 空文字列の場合は検索結果をクリア
              if (!value || value.trim() === '') {
                await this.treeProvider.updateSearchPattern('');
                this.treeProvider.clearResults();
                return;
              }

              const result = RegexValidator.validate(value);
              if (!result.isValid) {
                await ErrorHandler.showWarning(
                  result.error ?? '無効なパターンです'
                );
                return;
              }
              await this.treeProvider.updateSearchPattern(value);
              // 自動検索実行
              await this.treeProvider.executeSearch();
            } else if (message.field === 'includeFolders') {
              const value = String(message.value ?? '');
              const folders = this.parseFolderList(value);
              await this.config.setIncludeFolders(folders);
              await this.treeProvider.executeSearch();
            } else if (message.field === 'excludeFolders') {
              const value = String(message.value ?? '');
              const folders = this.parseFolderList(value);
              await this.config.setExcludeFolders(folders);
              await this.treeProvider.executeSearch();
            } else if (message.field === 'replacement') {
              const value = String(message.value ?? '');
              await this.config.setReplacementString(value);
              await this.updatePreview();
            }
            break;

          case 'executeRename':
            await this.executeRename();
            break;

          case 'undo':
            await this.undoRename();
            break;

          case 'redo':
            await this.redoRename();
            break;

          case 'requestPreview':
            await this.updatePreview();
            break;
        }
      } catch (error) {
        await ErrorHandler.showError(
          error instanceof Error ? error : new Error(t('errors.unknownError')),
          'SearchInputViewProvider.onMessage'
        );
      }
    });
  }

  /**
   * カンマ区切りの文字列を配列に変換（空文字列要素を除外）
   */
  private parseFolderList(value: string): string[] {
    if (!value || value.trim() === '') {
      return [];
    }
    return value
      .split(',')
      .map((folder) => folder.trim())
      .filter((folder) => folder.length > 0);
  }

  /**
   * プレビューを更新
   */
  private async updatePreview(): Promise<void> {
    if (!this.view) {
      return;
    }

    const searchParams = this.config.searchParams;
    const replacement = this.config.replacementString;

    if (!searchParams.searchPattern || !replacement) {
      this.view.webview.postMessage({
        type: 'previewUpdate',
        previews: [],
      });
      return;
    }

    // 検索結果からファイルリストを取得
    const searchResults = this.treeProvider.getSearchState();
    if (!searchResults.results) {
      this.view.webview.postMessage({
        type: 'previewUpdate',
        previews: [],
      });
      return;
    }

    const previews = this.renameService.previewRename(
      searchResults.results.files,
      searchParams.searchPattern,
      replacement
    );

    this.view.webview.postMessage({
      type: 'previewUpdate',
      previews: previews.slice(0, 5).map((p) => ({
        oldFileName: p.oldFileName,
        newFileName: p.newFileName,
        needsDirectoryMove: p.needsDirectoryMove,
      })),
    });
  }

  /**
   * ファイル名置き換えを実行
   */
  private async executeRename(): Promise<void> {
    if (!this.view) {
      Logger.logError(
        new Error('viewが存在しません'),
        'SearchInputViewProvider.executeRename'
      );
      return;
    }

    const searchParams = this.config.searchParams;
    const replacement = this.config.replacementString;

    if (!searchParams.searchPattern || !replacement) {
      await ErrorHandler.showWarning(t('errors.noReplacementString'));
      return;
    }

    // 検索結果からファイルリストを取得
    const searchResults = this.treeProvider.getSearchState();
    if (!searchResults.results || searchResults.results.files.length === 0) {
      await ErrorHandler.showWarning(t('commands.noFilesToRename'));
      return;
    }

    const previews = this.renameService.previewRename(
      searchResults.results.files,
      searchParams.searchPattern,
      replacement
    );

    if (previews.length === 0) {
      await ErrorHandler.showWarning(t('commands.noFilesToRename'));
      return;
    }

    // 検証
    const validation = await this.renameService.validateRename(previews);

    if (!validation.isValid) {
      await ErrorHandler.showError(
        new Error(validation.error || t('errors.renameValidationFailed')),
        'SearchInputViewProvider.executeRename'
      );
      return;
    }

    // 警告がある場合は確認ダイアログを表示
    if (validation.warnings && validation.warnings.length > 0) {
      const message =
        validation.warnings.join('\n') +
        '\n\n' +
        t('commands.continueRenameQuestion');
      const action = await vscode.window.showWarningMessage(
        message,
        { modal: true },
        t('commands.continueRename')
      );

      if (action !== t('commands.continueRename')) {
        return;
      }
    }

    // 実行
    try {
      const result = await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: t('commands.renaming'),
          cancellable: false,
        },
        async () => {
          return await this.renameService.executeRename(previews);
        }
      );

      // プログレス通知が閉じた後に結果を表示（非同期で実行）
      if (result.failureCount > 0) {
        ErrorHandler.showWarning(
          t('commands.renamePartialFailure', result.failureCount)
        ).catch((error) => {
          if (error.name !== 'Canceled') {
            Logger.logError(
              error instanceof Error ? error : new Error(String(error)),
              'SearchInputViewProvider.showWarning'
            );
          }
        });
      } else {
        ErrorHandler.showInfo(
          t('commands.renameSuccess', result.successCount)
        ).catch((error) => {
          if (error.name !== 'Canceled') {
            Logger.logError(
              error instanceof Error ? error : new Error(String(error)),
              'SearchInputViewProvider.showInfo'
            );
          }
        });
      }

      // 検索結果を更新
      await this.treeProvider.executeSearch();
    } catch (error) {
      await ErrorHandler.showError(
        error instanceof Error ? error : new Error(t('errors.unknownError')),
        'SearchInputViewProvider.executeRename'
      );
    }
  }

  /**
   * Undo操作
   */
  private async undoRename(): Promise<void> {
    try {
      const result = await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: t('commands.undoing'),
          cancellable: false,
        },
        async () => {
          return await this.renameService.undo();
        }
      );

      // プログレス通知が閉じた後に結果を表示（非同期で実行）
      if (result.failureCount > 0) {
        ErrorHandler.showWarning(
          t('commands.undoPartialFailure', result.failureCount)
        ).catch((error) => {
          if (error.name !== 'Canceled') {
            Logger.logError(
              error instanceof Error ? error : new Error(String(error)),
              'SearchInputViewProvider.showWarning'
            );
          }
        });
      } else {
        ErrorHandler.showInfo(t('commands.undoSuccess')).catch((error) => {
          if (error.name !== 'Canceled') {
            Logger.logError(
              error instanceof Error ? error : new Error(String(error)),
              'SearchInputViewProvider.showInfo'
            );
          }
        });
      }

      // 検索結果を更新
      await this.treeProvider.executeSearch();
    } catch (error) {
      await ErrorHandler.showError(
        error instanceof Error ? error : new Error(t('errors.unknownError')),
        'SearchInputViewProvider.undoRename'
      );
    }
  }

  /**
   * Redo操作
   */
  private async redoRename(): Promise<void> {
    try {
      const result = await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: t('commands.redoing'),
          cancellable: false,
        },
        async () => {
          return await this.renameService.redo();
        }
      );

      // プログレス通知が閉じた後に結果を表示（非同期で実行）
      if (result.failureCount > 0) {
        ErrorHandler.showWarning(
          t('commands.redoPartialFailure', result.failureCount)
        ).catch((error) => {
          if (error.name !== 'Canceled') {
            Logger.logError(
              error instanceof Error ? error : new Error(String(error)),
              'SearchInputViewProvider.showWarning'
            );
          }
        });
      } else {
        ErrorHandler.showInfo(t('commands.redoSuccess')).catch((error) => {
          if (error.name !== 'Canceled') {
            Logger.logError(
              error instanceof Error ? error : new Error(String(error)),
              'SearchInputViewProvider.showInfo'
            );
          }
        });
      }

      // 検索結果を更新
      await this.treeProvider.executeSearch();
    } catch (error) {
      await ErrorHandler.showError(
        error instanceof Error ? error : new Error(t('errors.unknownError')),
        'SearchInputViewProvider.redoRename'
      );
    }
  }

  /**
   * HTMLコンテンツを生成
   */
  private getHtml(
    searchPattern: string,
    includeFolders: string,
    excludeFolders: string,
    replacementString: string
  ): string {
    const nonce = String(Date.now());
    const esc = (s: string): string =>
      s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

    return /* html */ `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}'; connect-src 'none';" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    body { 
      font-family: var(--vscode-font-family); 
      padding: 8px; 
      color: var(--vscode-foreground); 
      margin: 0;
    }
    .container {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .label { 
      font-size: 12px; 
      opacity: 0.8; 
      margin-bottom: 4px; 
    }
    input[type="text"] { 
      width: 100%; 
      box-sizing: border-box; 
      padding: 6px; 
      background: var(--vscode-input-background); 
      color: var(--vscode-input-foreground); 
      border: 1px solid var(--vscode-input-border); 
      border-radius: 4px; 
      font-size: 13px;
    }
    input[type="text"]:focus {
      outline: none;
      border-color: var(--vscode-focusBorder);
    }
    .help-text {
      font-size: 11px;
      opacity: 0.7;
      margin-top: 4px;
    }
    .preview-container {
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-input-border);
      border-radius: 4px;
      padding: 8px;
      max-height: 150px;
      overflow-y: auto;
      font-size: 11px;
    }
    .preview-item {
      padding: 2px 0;
    }
    .preview-item.warning {
      color: var(--vscode-list-warningForeground);
    }
    button {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      padding: 6px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
      margin-right: 4px;
      margin-top: 4px;
    }
    button:hover {
      background: var(--vscode-button-hoverBackground);
    }
    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .button-group {
      display: flex;
      gap: 4px;
      flex-wrap: wrap;
    }
  </style>
</head>
<body>
  <div class="container">
    <div>
      <div class="label">${esc(t('ui.searchPattern.label'))}</div>
      <input id="search" type="text" placeholder="${esc(t('ui.searchPattern.placeholder'))}" value="${esc(searchPattern)}" />
      <div class="help-text">${esc(t('ui.searchPattern.helpText'))}</div>
    </div>
    <div>
      <div class="label">${esc(t('ui.includeFolders.label'))}</div>
      <input id="includeFolders" type="text" placeholder="${esc(t('ui.includeFolders.placeholder'))}" value="${esc(includeFolders)}" />
      <div class="help-text">${esc(t('ui.includeFolders.helpText'))}</div>
    </div>
    <div>
      <div class="label">${esc(t('ui.excludeFolders.label'))}</div>
      <input id="excludeFolders" type="text" placeholder="${esc(t('ui.excludeFolders.placeholder'))}" value="${esc(excludeFolders)}" />
      <div class="help-text">${esc(t('ui.excludeFolders.helpText'))}</div>
    </div>
    <div>
      <div class="label">${esc(t('ui.replacement.label'))}</div>
      <input id="replacement" type="text" placeholder="${esc(t('ui.replacement.placeholder'))}" value="${esc(replacementString)}" />
      <div class="help-text">${esc(t('ui.replacement.helpText'))}</div>
    </div>
    <div id="previewContainer"></div>
    <div class="button-group">
      <button id="executeRename">${esc(t('ui.buttons.executeRename'))}</button>
      <button id="undo">${esc(t('ui.buttons.undo'))}</button>
      <button id="redo">${esc(t('ui.buttons.redo'))}</button>
    </div>
  </div>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();

    function debounce(fn, ms) {
      let timeoutId;
      return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn(...args), ms);
      };
    }

    const searchInput = document.getElementById('search');
    const includeFoldersInput = document.getElementById('includeFolders');
    const excludeFoldersInput = document.getElementById('excludeFolders');
    const replacementInput = document.getElementById('replacement');
    const previewContainer = document.getElementById('previewContainer');
    const executeRenameBtn = document.getElementById('executeRename');
    const undoBtn = document.getElementById('undo');
    const redoBtn = document.getElementById('redo');

    const sendUpdate = debounce((field, value) => {
      vscode.postMessage({ type: 'update', field, value });
    }, 300);

    const requestPreview = debounce(() => {
      vscode.postMessage({ type: 'requestPreview' });
    }, 300);

    searchInput.addEventListener('input', (e) => {
      sendUpdate('search', e.target.value);
      requestPreview();
    });

    includeFoldersInput.addEventListener('input', (e) => {
      sendUpdate('includeFolders', e.target.value);
    });

    excludeFoldersInput.addEventListener('input', (e) => {
      sendUpdate('excludeFolders', e.target.value);
    });

    replacementInput.addEventListener('input', (e) => {
      sendUpdate('replacement', e.target.value);
      requestPreview();
    });

    executeRenameBtn.addEventListener('click', () => {
      vscode.postMessage({ type: 'executeRename' });
    });

    undoBtn.addEventListener('click', () => {
      vscode.postMessage({ type: 'undo' });
    });

    redoBtn.addEventListener('click', () => {
      vscode.postMessage({ type: 'redo' });
    });

    // メッセージハンドラー
    window.addEventListener('message', (event) => {
      const message = event.data;
      switch (message.type) {
        case 'previewUpdate':
          updatePreview(message.previews);
          break;
        case 'undoState':
          undoBtn.disabled = !message.canUndo;
          break;
        case 'redoState':
          redoBtn.disabled = !message.canRedo;
          break;
      }
    });

    const previewLabel = ${JSON.stringify(t('ui.preview.label'))};

    function updatePreview(previews) {
      if (!previews || previews.length === 0) {
        previewContainer.innerHTML = '';
        return;
      }

      let html = '<div class="preview-container"><strong>' + previewLabel + '</strong><br/>';
      for (const preview of previews) {
        const className = preview.needsDirectoryMove ? 'preview-item warning' : 'preview-item';
        html += '<div class="' + className + '">' + preview.oldFileName + ' → ' + preview.newFileName + '</div>';
      }
      html += '</div>';
      previewContainer.innerHTML = html;
    }

    // 初期プレビューリクエスト
    requestPreview();
  </script>
</body>
</html>`;
  }

  /**
   * リソースをクリーンアップ
   */
  dispose(): void {
    this._disposables.forEach((disposable) => disposable.dispose());
    this._disposables.length = 0;
  }
}
