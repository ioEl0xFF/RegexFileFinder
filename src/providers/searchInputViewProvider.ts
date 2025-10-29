import * as vscode from 'vscode';
import { ConfigService } from '../services/configService';
import { ErrorHandler } from '../services/errorHandler';
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

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly treeProvider: SearchTreeProvider
  ) {
    this.config = new ConfigService();
  }

  /**
   * WebviewViewを解決
   */
  resolveWebviewView(webviewView: vscode.WebviewView): void {
    this.view = webviewView;
    webviewView.webview.options = {
      enableScripts: true
    };

    const params = this.config.searchParams;
    webviewView.webview.html = this.getHtml(params.searchPattern);

    webviewView.webview.onDidReceiveMessage(async (message) => {
      try {
        switch (message.type) {
          case 'update':
            if (message.field === 'search') {
              const value = String(message.value ?? '');
              const result = RegexValidator.validate(value);
              if (!result.isValid) {
                await ErrorHandler.showWarning(result.error ?? '無効なパターンです');
                return;
              }
              await this.treeProvider.updateSearchPattern(value);
              // 自動検索実行
              await this.treeProvider.executeSearch();
            }
            break;

        }
      } catch (error) {
        await ErrorHandler.showError(
          error instanceof Error ? error : new Error('入力ビュー処理中にエラーが発生しました'),
          'SearchInputViewProvider.onMessage'
        );
      }
    });
  }

  /**
   * HTMLコンテンツを生成
   */
  private getHtml(searchPattern: string): string {
    const nonce = String(Date.now());
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

    return /* html */`
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';" />
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
  </style>
</head>
<body>
  <div class="container">
    <div>
      <div class="label">検索パターン（正規表現）</div>
      <input id="search" type="text" placeholder="例: .*\\.tsx$" value="${esc(searchPattern)}" />
      <div class="help-text">入力すると自動的に検索が実行されます</div>
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

    const sendUpdate = debounce((field, value) => {
      vscode.postMessage({ type: 'update', field, value });
    }, 300);

    searchInput.addEventListener('input', (e) => {
      sendUpdate('search', e.target.value);
    });
  </script>
</body>
</html>`;
  }
}
