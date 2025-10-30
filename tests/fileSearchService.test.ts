import * as vscode from 'vscode';
import { FileSearchService } from '../src/services/fileSearchService';
import type { SearchParams } from '../src/types';
// JSON は require で読み込む（tsconfig の resolveJsonModule 不要）
// eslint-disable-next-line @typescript-eslint/no-var-requires
const fileList = require('./__fixtures__/fileList.json') as string[];
import { uri } from './testUtils';

jest.mock('vscode');

describe('FileSearchService.searchFiles', () => {
  const svc = new FileSearchService();

  const params: SearchParams = {
    searchPattern: '.*\\.(ts|tsx)$',
    includeFolders: ['**/*'],
    excludeFolders: ['**/node_modules/**']
  };

  beforeEach(() => {
    (vscode.workspace.findFiles as jest.Mock).mockReset();
    (vscode.window.withProgress as jest.Mock).mockClear();
    (vscode.workspace as any).workspaceFolders = [{}];
  });

  test('拡張子パターンでファイル名一致を返す', async () => {
    (vscode.workspace.findFiles as jest.Mock).mockResolvedValue(
      (fileList as string[]).map(p => uri(p))
    );

    const res = await svc.searchFiles(params, { batchSize: 50, showProgress: false });
    expect(res.success).toBe(true);
    if (res.success) {
      const names = res.data.files.map(f => f.fsPath);
      expect(names.some(n => n.endsWith('.ts'))).toBe(true);
      expect(names.some(n => n.endsWith('.tsx'))).toBe(true);
      expect(names.some(n => n.endsWith('.md'))).toBe(false);
    }
    // include/exclude が引数として渡されていること
    expect((vscode.workspace.findFiles as jest.Mock)).toHaveBeenCalledWith('**/*', '**/node_modules/**');
  });

  test('大規模件数でも完了（バッチ＋setImmediate）', async () => {
    const many = Array.from({ length: 250 }, (_, i) => uri(`/f_${i}.tsx`));
    (vscode.workspace.findFiles as jest.Mock).mockResolvedValue(many);

    const res = await svc.searchFiles(params, { batchSize: 100, showProgress: false });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.totalCount).toBe(250);
    }
  });

  test('ワークスペース未オープンはエラー', async () => {
    (vscode.workspace as any).workspaceFolders = [];
    (vscode.workspace.findFiles as jest.Mock).mockResolvedValue([]);

    const res = await svc.searchFiles(params);
    expect(res.success).toBe(false);
  });
});


