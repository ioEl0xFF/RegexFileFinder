import * as vscode from 'vscode';
import { SearchTreeProvider } from '../providers/searchTreeProvider';
import { registerSearchCommands } from './searchCommands';
import { registerRenameCommands } from './renameCommands';

/**
 * 全コマンドをまとめて登録
 */
export function registerAllCommands(
  context: vscode.ExtensionContext,
  treeProvider: SearchTreeProvider
): void {
  // 検索関連コマンドを登録
  registerSearchCommands(context, treeProvider);

  // リネーム関連コマンドを登録
  registerRenameCommands(context);
}
