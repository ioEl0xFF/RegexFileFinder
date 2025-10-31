/// <reference types="jest" />
import * as vscode from 'vscode';
import { registerSearchCommands } from '../src/commands/searchCommands';

jest.mock('vscode');

describe('registerSearchCommands', () => {
  test('必要なコマンドが登録される', () => {
    const context: vscode.ExtensionContext = { subscriptions: [] } as any;
    const treeProvider = {
      executeSearch: jest.fn(),
      clearResults: jest.fn(),
      expandAllNodes: jest.fn(),
      collapseAllNodes: jest.fn(),
    } as any;

    registerSearchCommands(context, treeProvider);

    const calls = (vscode.commands.registerCommand as jest.Mock).mock.calls.map(c => c[0]);
    expect(calls).toEqual(
      expect.arrayContaining([
        'regexFileFinder.executeSearch',
        'regexFileFinder.clearResults',
        'regexFileFinder.expandAll',
        'regexFileFinder.collapseAll',
        'regexFileFinder.executeRename',
        'regexFileFinder.undoRename',
        'regexFileFinder.redoRename',
      ])
    );
  });
});


