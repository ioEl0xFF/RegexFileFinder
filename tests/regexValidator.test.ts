import { RegexValidator } from '../src/utils/regexValidator';
import { ERROR_MESSAGES } from '../src/services/errorHandler';

describe('RegexValidator', () => {
  test('有効なパターンは通過する', () => {
    const result = RegexValidator.validate('.*\\.ts$');
    expect(result.isValid).toBe(true);
  });

  test('無効なパターンはエラーになる', () => {
    const result = RegexValidator.validate('[unclosed');
    expect(result.isValid).toBe(false);
    expect(result.error).toContain(ERROR_MESSAGES.INVALID_REGEX);
  });

  test('空文字はエラーになる', () => {
    const result = RegexValidator.validate('');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe(ERROR_MESSAGES.EMPTY_PATTERN);
  });

  test('危険なパターンは拒否される（深いネスト）', () => {
    const deepNested = '('.repeat(10) + 'a*' + ')'.repeat(10);
    const result = RegexValidator.validate(deepNested);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe(ERROR_MESSAGES.DANGEROUS_PATTERN);
  });

  test('createRegex は無効パターンで例外を投げる', () => {
    expect(() => RegexValidator.createRegex('[unclosed')).toThrow();
  });
});
