/// <reference types="jest" />
import * as vscode from 'vscode';
import { registerRenameCommands } from '../../src/commands/renameCommands';

jest.mock('vscode');

describe('registerRenameCommands', () => {
  test('リネーム関連のコマンドが登録される', () => {
    const context = { subscriptions: [] } as unknown as vscode.ExtensionContext;

    registerRenameCommands(context);

    const calls = (vscode.commands.registerCommand as jest.Mock).mock.calls.map(c => c[0]);
    expect(calls).toEqual(
      expect.arrayContaining([
        'regexFileFinder.executeRename',
        'regexFileFinder.undoRename',
        'regexFileFinder.redoRename',
      ])
    );
  });
});

