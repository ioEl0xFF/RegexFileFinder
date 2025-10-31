// 最低限の VS Code API モック
// 各テストで必要に応じて jest.mocked 関数の実装を書き換える

export class Uri {
  fsPath: string;
  constructor(fsPath: string) {
    this.fsPath = fsPath;
  }
  static file(p: string): Uri {
    return new Uri(p);
  }
}

export enum ProgressLocation {
  Notification = 15,
}

export class EventEmitter<T> {
  private listeners: Array<(e: T) => any> = [];
  event = (listener: (e: T) => any): { dispose: () => void } => {
    this.listeners.push(listener);
    return { dispose: () => { /* no-op */ } };
  };
  fire(data: T): void {
    for (const l of this.listeners) l(data);
  }
}

export class ThemeIcon {
  static Folder = { id: 'folder' } as any;
}

export class TreeItem {
  label: string;
  resourceUri?: Uri;
  collapsibleState?: any;
  iconPath?: any;
  command?: { command: string; title: string; arguments?: any[] };
  constructor(label: string) {
    this.label = label;
  }
}

export enum TreeItemCollapsibleState {
  None = 0,
  Collapsed = 1,
  Expanded = 2,
}

export enum FileType {
  Unknown = 0,
  File = 1,
  Directory = 2,
  SymbolicLink = 64,
}

export type CancellationToken = {
  isCancellationRequested: boolean;
  onCancellationRequested: (cb: () => void) => void;
};

const defaultToken: CancellationToken = {
  isCancellationRequested: false,
  onCancellationRequested: () => { /* no-op */ },
};

export class OutputChannel {
  appendLine = jest.fn((_value: string) => {});
  show = jest.fn((_preserveFocus?: boolean) => {});
  dispose = jest.fn(() => {});
}

export const window = {
  showErrorMessage: jest.fn(async (_msg: string) => undefined),
  showInformationMessage: jest.fn(async (_msg: string) => undefined),
  showWarningMessage: jest.fn(async (_msg: string) => undefined),
  withProgress: jest.fn(async (_options: any, task: any) => {
    const progress = { report: jest.fn() };
    return task(progress, defaultToken);
  }),
  registerTreeDataProvider: jest.fn(),
  createOutputChannel: jest.fn((_name: string) => new OutputChannel()),
};

export const workspace = {
  workspaceFolders: [{}] as any[],
  findFiles: jest.fn(async (_include?: string, _exclude?: string | null) => {
    return [] as Array<Uri>;
  }),
  getConfiguration: jest.fn((_section?: string) => ({
    get: jest.fn((_key: string, defaultValue?: any) => {
      // ログレベル設定のデフォルト値を返す
      if (_key === 'logLevel') {
        return defaultValue || 'INFO';
      }
      // ログファイル関連の設定のデフォルト値を返す
      if (_key === 'logFileEnabled') {
        return defaultValue || false;
      }
      if (_key === 'logFileDirectory') {
        return defaultValue || '';
      }
      return defaultValue;
    }),
    update: jest.fn(),
  })),
  onDidChangeConfiguration: jest.fn((_listener: (e: any) => any) => ({
    dispose: () => { /* no-op */ },
  })),
  fs: {
    stat: jest.fn(async (_uri: Uri) => ({ type: 2 })),
    createDirectory: jest.fn(async (_uri: Uri) => {}),
    readFile: jest.fn(async (_uri: Uri) => Buffer.from('')),
    writeFile: jest.fn(async (_uri: Uri, _content: Uint8Array) => {}),
  },
};

export const commands = {
  registerCommand: jest.fn((_id: string, _cb: (...args: any[]) => any) => ({
    dispose: () => { /* no-op */ },
  })),
  executeCommand: jest.fn(async (_id: string, ..._args: any[]) => undefined),
};

export type TreeView<T> = {
  reveal: (element: T, options?: { expand?: boolean }) => Promise<void>;
};

export const env = {
  appName: 'VSCode-Mock',
};

export const Disposable = class {
  dispose(): void { /* no-op */ }
};

export type ExtensionContext = {
  subscriptions: Array<{ dispose: () => void }>;
};

export default {
  Uri,
  ProgressLocation,
  EventEmitter,
  ThemeIcon,
  TreeItem,
  TreeItemCollapsibleState,
  FileType,
  OutputChannel,
  window,
  workspace,
  commands,
  env,
};

