/// <reference types="jest" />
import { ERROR_MESSAGES } from '../../src/services/errorHandler';
import { FileRenameService } from '../../src/services/fileRenameService';
import { uri } from '../testUtils';


jest.mock('vscode');

describe('FileRenameService', () => {
  let service: FileRenameService;

  beforeEach(() => {
    service = new FileRenameService();
  });

  describe('previewRename', () => {
    test('プレビューを生成する', () => {
      const files = [
        uri('/workspace/file1.ts'),
        uri('/workspace/file2.tsx')
      ];
      const previews = service.previewRename(files, '\\.ts$', '.component.ts');
      expect(previews).toHaveLength(1);
      expect(previews[0].oldFileName).toBe('file1.ts');
      expect(previews[0].newFileName).toBe('file1.component.ts');
    });

    test('パターンにマッチしないファイルは除外される', () => {
      const files = [
        uri('/workspace/file1.ts'),
        uri('/workspace/file2.js')
      ];
      const previews = service.previewRename(files, '\\.ts$', '.component.ts');
      expect(previews).toHaveLength(1);
    });

    test('空のパターンは空配列を返す', () => {
      const files = [uri('/workspace/file1.ts')];
      const previews = service.previewRename(files, '', '.component.ts');
      expect(previews).toHaveLength(0);
    });
  });

  describe('canUndo/canRedo', () => {
    test('初期状態ではUndoもRedoも不可能', () => {
      expect(service.canUndo()).toBe(false);
      expect(service.canRedo()).toBe(false);
    });
  });

  describe('executeRename', () => {
    test('空のプレビューは即座に成功', async () => {
      const result = await service.executeRename([]);
      expect(result.successCount).toBe(0);
      expect(result.failureCount).toBe(0);
    });
  });

  describe('undo', () => {
    test('履歴がない場合はエラー', async () => {
      await expect(service.undo()).rejects.toThrow(ERROR_MESSAGES.NO_UNDO_HISTORY);
    });
  });
});

