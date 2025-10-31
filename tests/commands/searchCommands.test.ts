/// <reference types="jest" />
import * as vscode from 'vscode';
import { registerSearchCommands } from '../../src/commands/searchCommands';

jest.mock('vscode');

import { SearchTreeProvider } from '../../src/providers/searchTreeProvider';

describe('registerSearchCommands', () => {
  test('検索関連のコマンドが登録される', () => {
    const context = { subscriptions: [] } as unknown as vscode.ExtensionContext;
    const treeProvider: Partial<SearchTreeProvider> = {
      executeSearch: jest.fn(),
      clearResults: jest.fn(),
      expandAllNodes: jest.fn(),
      collapseAllNodes: jest.fn(),
    };

    registerSearchCommands(context, treeProvider as SearchTreeProvider);

    const calls = (vscode.commands.registerCommand as jest.Mock).mock.calls.map(c => c[0]);
    expect(calls).toEqual(
      expect.arrayContaining([
        'regexFileFinder.executeSearch',
        'regexFileFinder.clearResults',
        'regexFileFinder.expandAll',
        'regexFileFinder.collapseAll',
      ])
    );
  });
});

