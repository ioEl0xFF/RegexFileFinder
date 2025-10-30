import { FileSearchService } from '../src/services/fileSearchService';
import { workspace, Uri, window } from 'vscode';

// ユーティリティ: モックのfindFilesを差し替え
function mockFindFiles(paths: string[]) {
  (workspace.findFiles as any) = async () => paths.map(p => Uri.file(p));
}

describe('FileSearchService', () => {
  test('グロブで取得したファイルから正規表現でフィルタする', async () => {
    mockFindFiles([
      '/repo/src/index.ts',
      '/repo/src/App.tsx',
      '/repo/README.md',
      '/repo/test.spec.ts',
    ]);

    const service = new FileSearchService();
    const result = await service.searchFiles(
      { searchPattern: '.*\\.(ts|tsx)$', includeFolders: ['**/*'], excludeFolders: [] },
      { batchSize: 2, showProgress: false }
    );

    expect(result.success).toBe(true);
    if (result.success) {
      const files = result.data.files.map(u => u.fsPath);
      expect(files).toContain('/repo/src/index.ts');
      expect(files).toContain('/repo/src/App.tsx');
      expect(files).not.toContain('/repo/README.md');
    }
  });

  test('キャンセルなしで withProgress が動作する', async () => {
    mockFindFiles(['/a.ts']);
    const service = new FileSearchService();
    const result = await service.searchFiles(
      { searchPattern: '.*', includeFolders: ['**/*'], excludeFolders: [] },
      { showProgress: true }
    );
    expect(result.success).toBe(true);
  });
});
