import * as path from 'path';
import * as vscode from 'vscode';
import { FileItem } from '../types';

/**
 * ファイルツリービュープロバイダー
 * 検索結果をフラットリストで表示する
 */
export class FileTreeProvider implements vscode.TreeDataProvider<FileItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<FileItem | undefined | null> = new vscode.EventEmitter<FileItem | undefined | null>();
  readonly onDidChangeTreeData: vscode.Event<FileItem | undefined | null> = this._onDidChangeTreeData.event;

  private searchResults: FileItem[] = [];

  /**
   * ツリーアイテムの表示情報を返す
   */
  getTreeItem(element: FileItem): vscode.TreeItem {
    const treeItem = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.None);
    
    // ファイルを開くコマンドを設定
    treeItem.command = {
      command: 'vscode.open',
      title: 'ファイルを開く',
      arguments: [element.resourceUri]
    };

    // ファイルパスを設定（アイコン表示に使用）
    treeItem.resourceUri = element.resourceUri;

    return treeItem;
  }

  /**
   * 子要素を取得（フラットリストのため、ルート要素のみ処理）
   */
  getChildren(element?: FileItem): Thenable<FileItem[]> {
    if (!element) {
      // ルート要素の場合は検索結果を返す
      return Promise.resolve(this.searchResults);
    }
    // フラットリストのため、子要素は常に空配列
    return Promise.resolve([]);
  }

  /**
   * 検索結果を更新してツリービューをリフレッシュ
   */
  updateResults(files: vscode.Uri[]): void {
    this.searchResults = files.map(fileUri => {
      // ワークスペースルートからの相対パスを表示名とする
      const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri;
      let label: string;
      
      if (workspaceRoot) {
        const relativePath = path.relative(workspaceRoot.fsPath, fileUri.fsPath);
        label = relativePath;
      } else {
        label = path.basename(fileUri.fsPath);
      }

      return {
        label,
        resourceUri: fileUri
      };
    });

    this.refresh();
  }

  /**
   * ツリービューを再描画
   */
  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }
}
