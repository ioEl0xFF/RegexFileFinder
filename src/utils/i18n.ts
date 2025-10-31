import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

/**
 * 翻訳データの型定義
 */
interface TranslationData {
  [key: string]: string | TranslationData;
}

/**
 * 言語タイプ
 */
type Language = 'en' | 'ja';

/**
 * 翻訳データのキャッシュ
 */
let translationCache: {
  en: TranslationData | null;
  ja: TranslationData | null;
} = {
  en: null,
  ja: null,
};

/**
 * 現在の言語
 */
let currentLanguage: Language = 'en';

/**
 * 設定変更監視用のDisposable
 */
let configWatcher: vscode.Disposable | undefined;

/**
 * 言語を自動検出（VS Codeの言語設定から）
 */
function detectLanguage(): Language {
  const vscodeLang = vscode.env.language.toLowerCase();
  if (vscodeLang.startsWith('ja')) {
    return 'ja';
  }
  return 'en';
}

/**
 * 拡張機能の言語設定を取得
 */
function getLanguageSetting(): Language {
  try {
    const config = vscode.workspace.getConfiguration('regexFileFinder');
    const lang = config.get<string>('language', 'auto');

    if (lang === 'auto') {
      return detectLanguage();
    }

    if (lang === 'ja') {
      return 'ja';
    }

    return 'en';
  } catch {
    return detectLanguage();
  }
}

/**
 * 翻訳ファイルを読み込む
 */
function loadTranslationFile(lang: Language): TranslationData | null {
  try {
    // まず拡張機能のパスを取得
    const extensionPath = vscode.extensions.getExtension(
      'ioel0xff.regex-file-finder'
    )?.extensionPath;

    // 拡張機能のパスから読み込む
    if (extensionPath) {
      const localesPath = path.join(extensionPath, 'locales', `${lang}.json`);
      if (fs.existsSync(localesPath)) {
        const content = fs.readFileSync(localesPath, 'utf-8');
        return JSON.parse(content) as TranslationData;
      }
    }

    // 開発中の場合：相対パスから読み込む（distディレクトリから見て../../locales）
    const devLocalesPath = path.join(
      __dirname,
      '../../locales',
      `${lang}.json`
    );
    if (fs.existsSync(devLocalesPath)) {
      const content = fs.readFileSync(devLocalesPath, 'utf-8');
      return JSON.parse(content) as TranslationData;
    }

    // さらに、プロジェクトルートから直接読み込むことを試みる
    const rootLocalesPath = path.join(
      __dirname,
      '../../../locales',
      `${lang}.json`
    );
    if (fs.existsSync(rootLocalesPath)) {
      const content = fs.readFileSync(rootLocalesPath, 'utf-8');
      return JSON.parse(content) as TranslationData;
    }

    return null;
  } catch (error) {
    console.error(`[i18n] 翻訳ファイルの読み込みエラー (${lang}):`, error);
    return null;
  }
}

/**
 * 翻訳データを取得（キャッシュ優先）
 */
function getTranslationData(lang: Language): TranslationData | null {
  if (translationCache[lang] === null) {
    translationCache[lang] = loadTranslationFile(lang);
  }
  return translationCache[lang];
}

/**
 * ネストされたキーから値を取得
 */
function getNestedValue(
  data: TranslationData | null,
  key: string
): string | undefined {
  if (!data) {
    return undefined;
  }

  const keys = key.split('.');
  let current: TranslationData | string | undefined = data;

  for (const k of keys) {
    if (typeof current === 'string') {
      return undefined;
    }
    current = current?.[k];
    if (current === undefined) {
      return undefined;
    }
  }

  return typeof current === 'string' ? current : undefined;
}

/**
 * 文字列内のプレースホルダーを置換
 */
function replacePlaceholders(template: string, ...args: unknown[]): string {
  let result = template;
  for (let i = 0; i < args.length; i++) {
    const placeholder = `{${i}}`;
    result = result.replace(placeholder, String(args[i]));
  }
  return result;
}

/**
 * 翻訳を取得
 */
export function t(key: string, ...args: unknown[]): string {
  const lang = getLanguageSetting();
  const data = getTranslationData(lang);

  let translation = getNestedValue(data, key);

  // 翻訳が見つからない場合はフォールバック
  if (!translation) {
    // 英語を試す
    if (lang !== 'en') {
      const enData = getTranslationData('en');
      translation = getNestedValue(enData, key);
    }

    // それでも見つからない場合はキーを返す
    if (!translation) {
      console.warn(`[i18n] 翻訳が見つかりません: ${key}`);
      return key;
    }
  }

  // プレースホルダーを置換
  if (args.length > 0) {
    return replacePlaceholders(translation, ...args);
  }

  return translation;
}

/**
 * 現在の言語を取得
 */
export function getCurrentLanguage(): string {
  return currentLanguage;
}

/**
 * 言語を設定（主にテスト用）
 */
export function setLanguage(lang: Language): void {
  currentLanguage = lang;
}

/**
 * i18nを初期化（設定変更の監視を開始）
 */
export function initializeI18n(context: vscode.ExtensionContext): void {
  // 初期言語設定
  currentLanguage = getLanguageSetting();

  // 設定変更の監視
  configWatcher = vscode.workspace.onDidChangeConfiguration((event) => {
    if (event.affectsConfiguration('regexFileFinder.language')) {
      const oldLang = currentLanguage;
      currentLanguage = getLanguageSetting();

      // 言語が変わった場合はキャッシュをクリア
      if (oldLang !== currentLanguage) {
        console.log(
          `[i18n] 言語が変更されました: ${oldLang} -> ${currentLanguage}`
        );
        clearTranslationCache();
      }
    }
  });

  context.subscriptions.push(configWatcher);
}

/**
 * 翻訳キャッシュをクリア
 */
export function clearTranslationCache(): void {
  translationCache.en = null;
  translationCache.ja = null;
}
