import { ErrorHandler, RegexError, ERROR_MESSAGES } from '../src/services/errorHandler';
import { window } from 'vscode';

jest.spyOn(window, 'showErrorMessage').mockResolvedValue(undefined as any);

describe('ErrorHandler', () => {
  test('RegexError のメッセージを表示する', async () => {
    const err = new RegexError('不正なパターン', '[unclosed');
    await ErrorHandler.showError(err, 'test');
    expect(window.showErrorMessage).toHaveBeenCalled();
  });

  test('未知エラーも表示される', async () => {
    await ErrorHandler.showError(new Error('oops'));
    expect(window.showErrorMessage).toHaveBeenCalled();
  });
});
