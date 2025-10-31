# Regex File Finder

VSCode でファイル名を正規表現パターンで検索・置き換えできる拡張機能です。

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-2.1.0-blue.svg)](https://github.com/ioEl0xFF/RegexFileFinder)

## 機能

### 検索機能

- **正規表現検索**: Webviewビューから正規表現パターンを入力してファイル名を検索
- **ツリービュー表示**: 検索結果をサイドバーのツリービューに見やすく表示
- **ワンクリックでオープン**: ファイルをクリックして該当ファイルを開く
- **VSCode 設定を尊重**: `files.exclude`, `search.exclude`の設定を自動的に適用
- **入力検証**: 正規表現の構文エラーをリアルタイムでチェック
- **検索結果の件数表示**: マッチしたファイル数を通知
- **フォルダフィルタリング**: 含むフォルダ・除外フォルダを指定可能

### ファイル名置き換え機能

- **一括リネーム**: 正規表現パターンで検索したファイル名を置換文字列で一括リネーム
- **プレビュー機能**: 置き換え前に変更内容をプレビューで確認
- **Undo/Redo**: 置き換え操作の取り消し・やり直しが可能（最大10件まで）
- **バリデーション**: 無効なファイル名や重複を事前に検証

### その他の機能

- **国際化対応**: 日本語・英語に対応（`regexFileFinder.language`で切り替え可能）
- **ログ機能**: ログレベル制御とログファイル出力に対応

## インストール方法

### VSIX ファイルからインストール（推奨）

1. [Releases](https://github.com/ioEl0xFF/RegexFileFinder/releases)から最新の`.vsix`ファイルをダウンロード
2. VSCode を開く
3. 拡張機能ビュー（`Ctrl+Shift+X` / `Cmd+Shift+X`）を開く
4. 右上の`...`メニューから「VSIX からのインストール...」を選択
5. ダウンロードした`.vsix`ファイルを選択

**またはコマンドラインから**:

```bash
code --install-extension regex-file-finder-2.1.0.vsix
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
code --install-extension regex-file-finder-2.1.0.vsix
```

## 使い方

### 基本的な使い方

1. サイドバーの「**Regex File Finder**」アイコンをクリック（アクティビティバー）
2. 「**検索条件**」ビューが表示されます
3. 「検索パターン（正規表現）」欄に正規表現パターンを入力（例: `.*\.tsx$`）
4. 入力すると自動的に検索が実行され、「**検索結果**」ビューに結果が表示されます
5. ファイル名をクリックすると該当ファイルが開きます

### フォルダフィルタリング

検索条件ビューでは、以下の設定が可能です：

- **含むフォルダ**: 検索対象に含めるフォルダをグロブパターンで指定（例: `**/src/**`, `**/lib/**`）
- **含まないフォルダ**: 検索対象から除外するフォルダをグロブパターンで指定（例: `**/node_modules/**`, `**/dist/**`）

空欄の場合は全フォルダが対象になります。

### 検索結果の表示

検索結果はワークスペースルートからの相対パスでツリービュー表示されます：

```
検索結果
├─ src/
│  ├─ components/
│  │  ├─ Button.tsx
│  │  └─ Header.tsx
│  └─ utils/
│     └─ helpers.tsx
└─ tests/
   └─ Button.test.tsx
```

ツリービューのタイトルバーにある「すべて展開」「すべて折りたたむ」ボタンで表示を制御できます。

### ファイル名置き換えの使い方

1. 「検索条件」ビューで検索パターンを入力して検索を実行
2. 「置換文字列」欄に置換文字列を入力（例: `$1_renamed`）
   - キャプチャグループを使用する場合は `$1`, `$2` などが使用可能
3. プレビューで変更内容を確認
4. 「置き換え実行」ボタンをクリックして実行
5. 「Undo」ボタンで取り消し、「Redo」ボタンでやり直しが可能

## 正規表現パターンの例

| パターン                  | 説明                                       |
| ------------------------- | ------------------------------------------ |
| `.*\.tsx$`                | TSX ファイルを検索                         |
| `^test.*\.js$`            | test で始まる JS ファイル                  |
| `.*component.*`           | "component"を含むファイル                  |
| `^[A-Z].*\.ts$`           | 大文字で始まる TS ファイル                 |
| `.*\.(ts\|tsx\|js\|jsx)$` | TypeScript/JavaScript ファイル             |
| `^(?!.*test).*\.ts$`      | "test"を含まない TS ファイル（否定先読み） |
| `.*\.(json\|yaml\|yml)$`  | 設定ファイル（JSON/YAML）                  |

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

## 設定

VS Codeの設定（`settings.json`）で以下の項目を設定できます：

### 検索関連

- `regexFileFinder.searchPattern`: デフォルトの検索パターン（正規表現）
- `regexFileFinder.includeFolders`: 検索対象に含むフォルダ（グロブパターン、カンマ区切りで複数指定可能）
- `regexFileFinder.excludeFolders`: 検索対象から除外するフォルダ（グロブパターン、カンマ区切りで複数指定可能）

### ファイル名置き換え関連

- `regexFileFinder.replacementString`: ファイル名置き換え用の置換文字列（検索パターンを正規表現として使用）

### ログ関連

- `regexFileFinder.logLevel`: ログ出力レベル（`DEBUG`, `INFO`, `WARN`, `ERROR`、デフォルト: `INFO`）
- `regexFileFinder.logFileEnabled`: ログファイルを出力するかどうか（デフォルト: `false`）
- `regexFileFinder.logFileDirectory`: ログファイルの保存ディレクトリ（空の場合はVS Code拡張機能のログディレクトリを使用）

### 国際化関連

- `regexFileFinder.language`: 表示言語（`auto`: VS Codeの言語設定に自動追従、`en`: 英語、`ja`: 日本語、デフォルト: `auto`）

## 開発

### 必要な環境

- Node.js 18 以上
- VSCode 1.85.0 以上

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

1. VSCode で`F5`キーを押す
2. 新しい VSCode ウィンドウ（拡張機能開発ホスト）が起動
3. コマンドパレットから拡張機能をテスト
4. ブレークポイントでデバッグ可能

### プロジェクト構造

```
RegexFileFinder/
├── src/
│   ├── extension.ts                    # エントリーポイント
│   ├── commands/                       # コマンド実装
│   │   ├── index.ts                    # 全コマンドをまとめて登録
│   │   ├── searchCommands.ts          # 検索関連コマンド
│   │   └── renameCommands.ts          # リネーム関連コマンド
│   ├── providers/                      # TreeDataProvider等のプロバイダー
│   │   ├── searchTreeProvider.ts      # 検索結果ツリービュープロバイダー
│   │   └── searchInputViewProvider.ts  # 検索条件入力Webviewプロバイダー
│   ├── services/                       # ビジネスロジック
│   │   ├── fileSearchService.ts       # ファイル検索ロジック
│   │   ├── fileRenameService.ts       # ファイル名置き換えロジック
│   │   ├── configService.ts           # 設定管理
│   │   ├── errorHandler.ts            # エラーハンドリング
│   │   └── logger.ts                  # ログ出力機能
│   ├── utils/                          # ユーティリティ関数
│   │   ├── regexValidator.ts          # 正規表現バリデーション
│   │   ├── treeBuilder.ts             # ツリー構築
│   │   └── i18n.ts                    # 国際化機能
│   └── types/                          # 型定義
│       ├── index.ts                   # 全型をre-export
│       ├── result.ts                  # Result型パターン
│       ├── search.ts                  # 検索関連の型
│       ├── tree.ts                    # ツリー関連の型
│       └── rename.ts                  # リネーム関連の型
├── locales/                            # 翻訳ファイル
│   ├── ja.json                        # 日本語翻訳
│   └── en.json                        # 英語翻訳
├── dist/                               # ビルド出力（webpack）
├── package.json                        # 拡張機能マニフェスト
├── tsconfig.json                       # TypeScript設定
└── webpack.config.js                   # webpack設定
```

### 機能の実装

- **i18n機能**: `src/utils/i18n.ts`で実装され、VS Codeの設定変更を監視して言語を自動切り替え
- **Logger機能**: `src/services/logger.ts`で実装され、OutputChannelとログファイルに出力。ログレベル制御に対応

## 貢献

バグ報告や機能リクエストは[Issues](https://github.com/ioEl0xFF/RegexFileFinder/issues)からお願いします。

プルリクエストも歓迎します！

## ライセンス

MIT License

Copyright (c) 2025 ioel0xff

詳細は[LICENSE](LICENSE)ファイルをご覧ください。

## リンク

- [GitHub リポジトリ](https://github.com/ioEl0xFF/RegexFileFinder)
- [Issues](https://github.com/ioEl0xFF/RegexFileFinder/issues)
- [変更履歴](CHANGELOG.md)
