import * as vscode from 'vscode';
import { SearchTreeProvider } from '../../src/providers/searchTreeProvider';
import { uri } from '../testUtils';

jest.mock('vscode');

// ConfigService と FileSearchService をモック
jest.mock('../../src/services/configService', () => {
  return {
    ConfigService: class {
      get searchParams(): { searchPattern: string; includeFolders: string[]; excludeFolders: string[] } {
        return { searchPattern: '.*', includeFolders: ['**/*'], excludeFolders: [] };
      }
      async setSearchPattern(): Promise<void> { /* no-op */ }
      dispose(): void {}
    }
  };
});

jest.mock('../../src/services/fileSearchService', () => {
  return {
    FileSearchService: class {
      async searchFiles(): Promise<{ success: true; data: { files: ReturnType<typeof uri>[]; totalCount: number; searchTime: number; pattern: string } }> {
        return {
          success: true as const,
          data: {
            files: [uri('/workspace/a.ts'), uri('/workspace/b.tsx')],
            totalCount: 2,
            searchTime: 5,
            pattern: '.*'
          }
        };
      }
      dispose(): void {}
    }
  };
});

describe('SearchTreeProvider', () => {
  beforeEach(() => {
    Object.defineProperty(vscode.workspace, 'workspaceFolders', {
      value: [{ uri: { fsPath: '/workspace' } as vscode.Uri }],
      writable: true
    });
  });
  test('refresh でイベントが発火する', () => {
    const provider = new SearchTreeProvider();
    const listener = jest.fn();
    provider.onDidChangeTreeData(listener);
    provider.refresh();
    expect(listener).toHaveBeenCalled();
  });

  test('executeSearch 後に getChildren が結果を返す', async () => {
    const provider = new SearchTreeProvider();
    await provider.executeSearch();
    const children = provider.getChildren();
    expect(Array.isArray(children)).toBe(true);
    // 2ファイルがツリーに反映されていること（folder 展開構造は TreeBuilder に依存するため最低限）
    const flat = JSON.stringify(children);
    expect(flat).toContain('/workspace/a.ts');
    expect(flat).toContain('/workspace/b.tsx');
  });
});

