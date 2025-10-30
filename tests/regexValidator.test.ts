import { RegexValidator } from '../src/utils/regexValidator';

describe('RegexValidator.validate', () => {
  test('有効なパターンは isValid=true', () => {
    const res = RegexValidator.validate('.*\\.ts$');
    expect(res.isValid).toBe(true);
  });

  test('無効なパターンは isValid=false', () => {
    const res = RegexValidator.validate('[unclosed');
    expect(res.isValid).toBe(false);
    expect(res.error).toBeTruthy();
  });

  test('空文字列はエラー', () => {
    const res = RegexValidator.validate('');
    expect(res.isValid).toBe(false);
  });

  test('長すぎるパターンはエラー', () => {
    const long = 'a'.repeat(1001);
    const res = RegexValidator.validate(long);
    expect(res.isValid).toBe(false);
  });
});

describe('RegexValidator.createRegex', () => {
  test('有効なパターンから RegExp を生成', () => {
    const regex = RegexValidator.createRegex('^test.*');
    expect(regex).toBeInstanceOf(RegExp);
    expect(regex.test('testFile')).toBe(true);
  });

  test('無効なパターンは例外', () => {
    expect(() => RegexValidator.createRegex('(')).toThrow();
  });
});


describe('RegexValidator 追加エッジケース', () => {
  test('Unicode を含むパターンでも検証可能', () => {
    const res = RegexValidator.validate('^日本.*$');
    expect(res.isValid).toBe(true);
  });

  test('危険なパターンは拒否（深いネスト）', () => {
    const dangerous = '((((((((((a))))))))))';
    const res = RegexValidator.validate(dangerous);
    expect(res.isValid).toBe(false);
    expect(res.error).toBeTruthy();
  });

  test('パフォーマンス警告（.*.* を含む）', () => {
    const res = RegexValidator.validate('foo.*.*bar');
    expect(res.isValid).toBe(true);
    expect(res.warnings).toBeTruthy();
  });

  test('アンカーの正常系', () => {
    const res = RegexValidator.validate('^test.*\\.tsx$');
    expect(res.isValid).toBe(true);
  });
});


