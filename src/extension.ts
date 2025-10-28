import * as vscode from 'vscode';
import { registerSearchCommands } from './commands/searchCommands';
import { SearchTreeProvider } from './providers/searchTreeProvider';

/**
 * 拡張機能のアクティベーション処理
 */
export function activate(context: vscode.ExtensionContext) {
  console.log('[RegexFileFinder] 拡張機能がアクティベートされました');

  // 検索TreeProviderの初期化
  const searchTreeProvider = new SearchTreeProvider();
  
  // TreeViewの登録
  const treeView = vscode.window.createTreeView('regexFileFinder.searchView', {
    treeDataProvider: searchTreeProvider
  });
  context.subscriptions.push(treeView);
  console.log('[RegexFileFinder] TreeView登録完了');

  // コマンドの登録
  registerSearchCommands(context, searchTreeProvider);

  console.log('[RegexFileFinder] 初期化完了');
}

/**
 * 拡張機能の非アクティベーション処理
 */
export function deactivate() {
  console.log('[RegexFileFinder] 拡張機能が非アクティベートされました');
}
