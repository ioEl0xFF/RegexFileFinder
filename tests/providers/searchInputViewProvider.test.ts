/// <reference types="jest" />
import * as vscode from 'vscode';
import { SearchInputViewProvider } from '../../src/providers/searchInputViewProvider';
import { SearchTreeProvider } from '../../src/providers/searchTreeProvider';

jest.mock('vscode');

// ConfigService をモック
jest.mock('../../src/services/configService', () => {
  return {
    ConfigService: class {
      get searchParams(): { searchPattern: string; includeFolders: string[]; excludeFolders: string[] } {
        return { searchPattern: '.*', includeFolders: ['**/*'], excludeFolders: [] };
      }
      get replacementString(): string {
        return '';
      }
      async setIncludeFolders(): Promise<void> { /* no-op */ }
      async setExcludeFolders(): Promise<void> { /* no-op */ }
      async setReplacementString(): Promise<void> { /* no-op */ }
      dispose(): void {}
    }
  };
});

jest.mock('../../src/services/fileRenameService', () => {
  return {
    FileRenameService: class {
      dispose(): void {}
    }
  };
});

jest.mock('../../src/services/logger', () => {
  return {
    Logger: {
      logDebug: jest.fn(),
      logInfo: jest.fn(),
      logWarning: jest.fn(),
      logError: jest.fn(),
    }
  };
});

describe('SearchInputViewProvider', () => {
  let provider: SearchInputViewProvider;
  let treeProvider: SearchTreeProvider;

  beforeEach(() => {
    treeProvider = new SearchTreeProvider();
    const context = {
      extensionUri: { fsPath: '/workspace' } as vscode.Uri,
      subscriptions: [],
    } as unknown as vscode.ExtensionContext;
    provider = new SearchInputViewProvider(context, treeProvider);
  });

  test('インスタンスが作成できる', () => {
    expect(provider).toBeDefined();
  });
});
