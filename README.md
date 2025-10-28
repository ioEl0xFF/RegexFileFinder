# Regex File Finder

VSCode でファイル名を正規表現パターンで検索できる拡張機能です。

## 機能

- コマンドパレットから正規表現パターンを入力してファイル名を検索
- 検索結果をサイドバーのツリービューにフラットリストで表示
- ファイルをクリックして該当ファイルを開く
- VSCode の設定（`files.exclude`, `search.exclude`）を自動的に尊重

## インストール方法

1. このリポジトリをクローン
2. `npm install` で依存関係をインストール
3. `npm run compile` でビルド
4. `F5` キーで拡張機能開発ホストを起動してテスト

## 使い方

1. コマンドパレットを開く（`Ctrl+Shift+P` / `Cmd+Shift+P`）
2. "Regex File Finder: ファイル名を正規表現で検索"を選択
3. 正規表現パターンを入力
4. Enter キーで検索実行
5. エクスプローラーサイドバーの"正規表現検索結果"ビューに結果が表示される
6. ファイル名をクリックすると該当ファイルが開く

## 正規表現の例

- `.*\.tsx$` - TSX ファイルを検索
- `^test.*\.js$` - test で始まる JS ファイル
- `.*component.*` - "component"を含むファイル
- `^[A-Z].*\.ts$` - 大文字で始まる TS ファイル
- `.*\.(ts|tsx|js|jsx)$` - TypeScript/JavaScript ファイル

## 開発

### 必要な環境

- Node.js 18 以上
- VSCode 1.85.0 以上

### 開発コマンド

```bash
# 依存関係のインストール
npm install

# TypeScriptコンパイル
npm run compile

# ファイル監視モード
npm run watch

# パッケージ作成
npm run package
```

### デバッグ

1. VSCode で`F5`キーを押す
2. 新しい VSCode ウィンドウ（拡張機能開発ホスト）が起動
3. コマンドパレットから拡張機能をテスト
4. ブレークポイントでデバッグ可能

## ライセンス

MIT License
