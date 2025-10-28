import * as vscode from 'vscode';
import { registerSearchCommand } from './commands/searchCommand';
import { FileTreeProvider } from './providers/fileTreeProvider';

/**
 * 拡張機能のアクティベーション処理
 */
export function activate(context: vscode.ExtensionContext) {
  console.log('Regex File Finder 拡張機能がアクティベートされました');

  // ツリービュープロバイダーの初期化
  const treeProvider = new FileTreeProvider();
  
  // ツリービューの登録
  vscode.window.registerTreeDataProvider('regexFileFinder.results', treeProvider);
  
  // 検索コマンドの登録
  registerSearchCommand(context, treeProvider);
}

/**
 * 拡張機能の非アクティベーション処理
 */
export function deactivate() {
  console.log('Regex File Finder 拡張機能が非アクティベートされました');
}
