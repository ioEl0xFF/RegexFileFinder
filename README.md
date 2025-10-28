# Regex File Finder

VSCodeでファイル名を正規表現パターンで検索できる拡張機能です。

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)](https://github.com/ioEl0xFF/RegexFileFinder)

## 機能

- 🔍 **正規表現検索**: コマンドパレットから正規表現パターンを入力してファイル名を検索
- 📋 **フラットリスト表示**: 検索結果をサイドバーのツリービューに見やすく表示
- 📂 **ワンクリックでオープン**: ファイルをクリックして該当ファイルを開く
- ⚙️ **VSCode設定を尊重**: `files.exclude`, `search.exclude`の設定を自動的に適用
- ✅ **入力検証**: 正規表現の構文エラーをリアルタイムでチェック
- 📊 **検索結果の件数表示**: マッチしたファイル数を通知

## インストール方法

### VSIXファイルからインストール（推奨）

1. [Releases](https://github.com/ioEl0xFF/RegexFileFinder/releases)から最新の`.vsix`ファイルをダウンロード
2. VSCodeを開く
3. 拡張機能ビュー（`Ctrl+Shift+X` / `Cmd+Shift+X`）を開く
4. 右上の`...`メニューから「VSIXからのインストール...」を選択
5. ダウンロードした`.vsix`ファイルを選択

**またはコマンドラインから**:
```bash
code --install-extension regex-file-finder-0.1.0.vsix
```

### 開発版をビルドしてインストール

1. リポジトリをクローン
   ```bash
   git clone https://github.com/ioEl0xFF/RegexFileFinder.git
   cd RegexFileFinder
   ```
2. 依存関係をインストール
   ```bash
   npm install
   ```
3. パッケージをビルド
   ```bash
   npm run vsce:package
   ```
4. 生成された`.vsix`ファイルをインストール
   ```bash
   code --install-extension regex-file-finder-0.1.0.vsix
   ```

## 使い方

### 基本的な使い方

1. コマンドパレットを開く（`Ctrl+Shift+P` / `Cmd+Shift+P`）
2. 「**Regex File Finder: ファイル名を正規表現で検索**」を選択
3. 正規表現パターンを入力（例: `.*\.tsx$`）
4. Enterキーで検索実行
5. エクスプローラーサイドバーの「**正規表現検索結果**」ビューに結果が表示される
6. ファイル名をクリックすると該当ファイルが開く

### 検索結果の表示

検索結果はワークスペースルートからの相対パスでフラットリスト表示されます：

```
正規表現検索結果
├─ src/components/Button.tsx
├─ src/components/Header.tsx
├─ src/utils/helpers.tsx
└─ tests/Button.test.tsx
```

ファイルをクリックするとエディタで開きます。

## 正規表現パターンの例

| パターン | 説明 |
|---------|------|
| `.*\.tsx$` | TSXファイルを検索 |
| `^test.*\.js$` | testで始まるJSファイル |
| `.*component.*` | "component"を含むファイル |
| `^[A-Z].*\.ts$` | 大文字で始まるTSファイル |
| `.*\.(ts\|tsx\|js\|jsx)$` | TypeScript/JavaScriptファイル |
| `^(?!.*test).*\.ts$` | "test"を含まないTSファイル（否定先読み） |
| `.*\.(json\|yaml\|yml)$` | 設定ファイル（JSON/YAML） |

### よくある使用例

**コンポーネントファイルのみ検索**:
```regex
.*[Cc]omponent\.(tsx?|jsx?)$
```

**テストファイルを除外して検索**:
```regex
^(?!.*\.(test\|spec)\.).*\.ts$
```

**特定のディレクトリ配下のファイル**:
```regex
^src/utils/.*\.ts$
```

## 開発

### 必要な環境

- Node.js 18以上
- VSCode 1.85.0以上

### 開発コマンド

```bash
# 依存関係のインストール
npm install

# TypeScriptコンパイル（開発用）
npm run compile

# ファイル監視モード
npm run watch

# 本番用ビルド
npm run package

# .vsixパッケージ作成
npm run vsce:package
```

### デバッグ

1. VSCodeで`F5`キーを押す
2. 新しいVSCodeウィンドウ（拡張機能開発ホスト）が起動
3. コマンドパレットから拡張機能をテスト
4. ブレークポイントでデバッグ可能

### プロジェクト構造

```
RegexFileFinder/
├── src/
│   ├── extension.ts              # エントリーポイント
│   ├── commands/
│   │   └── searchCommand.ts      # 検索コマンド実装
│   ├── providers/
│   │   └── fileTreeProvider.ts   # ツリービュープロバイダー
│   ├── services/
│   │   └── fileSearchService.ts  # ファイル検索ロジック
│   └── types/
│       └── index.ts              # 型定義
├── dist/                         # ビルド出力（webpack）
├── package.json                  # 拡張機能マニフェスト
├── tsconfig.json                 # TypeScript設定
└── webpack.config.js             # webpack設定
```

## トラブルシューティング

### 検索結果が表示されない

- ワークスペースが正しく開かれているか確認してください
- VSCodeの設定で除外されているファイルは検索対象外です（`files.exclude`, `search.exclude`）

### 正規表現エラーが出る

- 入力した正規表現パターンが正しいか確認してください
- 特殊文字（`.`, `*`, `+`, `?`, `[`, `]`, `(`, `)`, `{`, `}`, `|`, `\`）はエスケープが必要な場合があります

## 貢献

バグ報告や機能リクエストは[Issues](https://github.com/ioEl0xFF/RegexFileFinder/issues)からお願いします。

プルリクエストも歓迎します！

## ライセンス

MIT License

Copyright (c) 2025 ioel0xff

詳細は[LICENSE](LICENSE)ファイルをご覧ください。

## リンク

- [GitHubリポジトリ](https://github.com/ioEl0xFF/RegexFileFinder)
- [Issues](https://github.com/ioEl0xFF/RegexFileFinder/issues)
- [変更履歴](CHANGELOG.md)
