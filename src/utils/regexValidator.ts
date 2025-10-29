import { ERROR_MESSAGES, RegexError } from '../services/errorHandler';

/**
 * 正規表現のバリデーション結果
 */
export interface RegexValidationResult {
  isValid: boolean;
  error?: string;
  warnings?: string[];
  complexity: 'low' | 'medium' | 'high';
}

/**
 * 正規表現バリデーター
 */
export class RegexValidator {
  private static readonly MAX_PATTERN_LENGTH = 1000;
  private static readonly DANGEROUS_PATTERNS = [
    // 非常に長い繰り返し（ReDoS攻撃の原因）
    /\([^)]*\){50,}/,
    /\[[^\]]*\]{50,}/,
    /\{[^}]*\}{50,}/,
    // 指数関数的なバックトラッキング（より厳密にチェック）
    /\([^)]*\)\*\([^)]*\)\*\([^)]*\)\*\([^)]*\)\*\([^)]*\)\*\([^)]*\)\*\([^)]*\)\*\([^)]*\)\*\([^)]*\)\*\([^)]*\)\*/,
    // 非常に深いネスト（10レベル以上）
    /\([^)]*\([^)]*\([^)]*\([^)]*\([^)]*\([^)]*\([^)]*\([^)]*\([^)]*\([^)]*\([^)]*\)*\)*\)*\)*\)*\)*\)*\)*\)*\)*\)/
  ];

  /**
   * 正規表現パターンをバリデーション
   */
  static validate(pattern: string): RegexValidationResult {
    const warnings: string[] = [];
    
    // 空文字チェック
    if (!pattern || pattern.trim() === '') {
      return {
        isValid: false,
        error: ERROR_MESSAGES.EMPTY_PATTERN,
        complexity: 'low'
      };
    }

    // 長さチェック
    if (pattern.length > this.MAX_PATTERN_LENGTH) {
      return {
        isValid: false,
        error: ERROR_MESSAGES.PATTERN_TOO_LONG,
        complexity: 'high'
      };
    }

    // 構文チェック
    try {
      new RegExp(pattern);
    } catch (error) {
      return {
        isValid: false,
        error: `${ERROR_MESSAGES.INVALID_REGEX}: ${error instanceof Error ? error.message : '不明なエラー'}`,
        complexity: 'low'
      };
    }

    // 危険なパターンチェック（より実用的なアプローチ）
    if (this.isDangerousPattern(pattern)) {
      return {
        isValid: false,
        error: ERROR_MESSAGES.DANGEROUS_PATTERN,
        complexity: 'high'
      };
    }

    // 複雑度チェック
    const complexity = this.analyzeComplexity(pattern);
    if (complexity === 'high') {
      warnings.push('正規表現が複雑です。パフォーマンスに影響する可能性があります。');
    }

    // その他の警告（より実用的なアドバイス）
    if (pattern.includes('.*.*')) {
      warnings.push('`.*.*` パターンは非効率です。`.*` で十分です。');
    }

    if (pattern.includes('[^]')) {
      warnings.push('`[^]` パターンは `[\\s\\S]` の方が明確です。');
    }

    if (pattern.includes('(.*)*') || pattern.includes('(.*)+')) {
      warnings.push('`(.*)*` や `(.*)+` パターンは非効率です。より具体的なパターンを使用してください。');
    }

    if (pattern.length > 200) {
      warnings.push('正規表現が長いです。分割して複数のパターンに分けることを検討してください。');
    }

    return {
      isValid: true,
      warnings: warnings.length > 0 ? warnings : undefined,
      complexity
    };
  }

  /**
   * 危険なパターンかどうかを判定
   */
  private static isDangerousPattern(pattern: string): boolean {
    // 基本的な危険パターンのチェック
    for (const dangerousPattern of this.DANGEROUS_PATTERNS) {
      if (dangerousPattern.test(pattern)) {
        return true;
      }
    }

    // 追加の危険パターンチェック
    // 1. 非常に長い繰り返し（{100,}以上）
    if (/\{[0-9]+,\}/.test(pattern)) {
      const matches = pattern.match(/\{([0-9]+),\}/g);
      if (matches) {
        for (const match of matches) {
          const num = parseInt(match.match(/\{([0-9]+),\}/)?.[1] || '0');
          if (num >= 100) {
            return true;
          }
        }
      }
    }

    // 2. 連続する量指定子（.*.*.*など）
    if (/(\*|\+|\?)\1{5,}/.test(pattern)) {
      return true;
    }

    // 3. 非常に深いネスト（手動でカウント）
    let maxNesting = 0;
    let currentNesting = 0;
    for (const char of pattern) {
      if (char === '(') {
        currentNesting++;
        maxNesting = Math.max(maxNesting, currentNesting);
      } else if (char === ')') {
        currentNesting = Math.max(0, currentNesting - 1);
      }
    }
    if (maxNesting >= 10) {
      return true;
    }

    return false;
  }

  /**
   * 正規表現の複雑度を分析
   */
  private static analyzeComplexity(pattern: string): 'low' | 'medium' | 'high' {
    let score = 0;

    // 基本的な複雑度要因
    score += (pattern.match(/\(/g) || []).length; // グループ
    score += (pattern.match(/\[/g) || []).length; // 文字クラス
    score += (pattern.match(/\{/g) || []).length; // 量指定子
    score += (pattern.match(/\|/g) || []).length; // 選択
    score += (pattern.match(/\?/g) || []).length; // オプション
    score += (pattern.match(/\+/g) || []).length; // 1回以上
    score += (pattern.match(/\*/g) || []).length; // 0回以上

    // ネストの深さ
    const maxNesting = this.calculateMaxNesting(pattern);
    score += maxNesting * 2;

    // 後方参照
    score += (pattern.match(/\\\d+/g) || []).length * 3;

    // 先読み・後読み
    score += (pattern.match(/\(\?[=!<]/g) || []).length * 2;

    if (score <= 5) return 'low';
    if (score <= 15) return 'medium';
    return 'high';
  }

  /**
   * パターンの最大ネスト深さを計算
   */
  private static calculateMaxNesting(pattern: string): number {
    let maxNesting = 0;
    let currentNesting = 0;

    for (const char of pattern) {
      if (char === '(') {
        currentNesting++;
        maxNesting = Math.max(maxNesting, currentNesting);
      } else if (char === ')') {
        currentNesting = Math.max(0, currentNesting - 1);
      }
    }

    return maxNesting;
  }

  /**
   * 正規表現を安全に作成
   */
  static createRegex(pattern: string, flags?: string): RegExp {
    const validation = this.validate(pattern);
    
    if (!validation.isValid) {
      throw new RegexError(validation.error || '無効な正規表現', pattern);
    }

    if (validation.warnings && validation.warnings.length > 0) {
      console.warn('正規表現の警告:', validation.warnings);
    }

    return new RegExp(pattern, flags);
  }

  /**
   * パターンがファイル名検索に適しているかチェック
   */
  static isSuitableForFileName(pattern: string): boolean {
    const validation = this.validate(pattern);
    
    if (!validation.isValid) {
      return false;
    }

    // ファイル名検索に不適切なパターンをチェック
    const unsuitablePatterns = [
      /\\n/, // 改行文字
      /\\r/, // キャリッジリターン
      /\\t/, // タブ文字
      /\\s/, // 空白文字（ファイル名には通常含まれない）
      /^/,   // 行の開始
      /$/,   // 行の終了
    ];

    return !unsuitablePatterns.some(p => p.test(pattern));
  }

  /**
   * パターンの例を生成
   */
  static generateExamples(): string[] {
    return [
      '.*\\.ts$',           // TypeScriptファイル
      '.*\\.tsx$',          // TSXファイル
      '.*\\.js$',           // JavaScriptファイル
      '^test.*\\.js$',      // testで始まるJSファイル
      '.*component.*',      // componentを含むファイル
      '.*\\.(ts|tsx|js)$',  // 複数拡張子
      '^[A-Z].*',           // 大文字で始まるファイル
      '.*\\.test\\.(ts|js)$' // テストファイル
    ];
  }

  /**
   * パターンの説明を生成
   */
  static generateDescription(pattern: string): string {
    const examples = this.generateExamples();
    const matchingExample = examples.find(ex => ex === pattern);
    
    if (matchingExample) {
      const descriptions: Record<string, string> = {
        '.*\\.ts$': 'TypeScriptファイル（.ts）',
        '.*\\.tsx$': 'TSXファイル（.tsx）',
        '.*\\.js$': 'JavaScriptファイル（.js）',
        '^test.*\\.js$': 'testで始まるJavaScriptファイル',
        '.*component.*': 'componentを含むファイル名',
        '.*\\.(ts|tsx|js)$': 'TypeScriptまたはJavaScriptファイル',
        '^[A-Z].*': '大文字で始まるファイル名',
        '.*\\.test\\.(ts|js)$': 'テストファイル（.test.ts または .test.js）'
      };
      return descriptions[matchingExample] || 'カスタムパターン';
    }

    return 'カスタムパターン';
  }
}
