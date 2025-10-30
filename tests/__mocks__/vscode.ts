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

export type CancellationToken = {
  isCancellationRequested: boolean;
  onCancellationRequested: (cb: () => void) => void;
};

const defaultToken: CancellationToken = {
  isCancellationRequested: false,
  onCancellationRequested: () => { /* no-op */ },
};

export const window = {
  showErrorMessage: jest.fn(async (_msg: string) => undefined),
  showInformationMessage: jest.fn(async (_msg: string) => undefined),
  showWarningMessage: jest.fn(async (_msg: string) => undefined),
  withProgress: jest.fn(async (_options: any, task: any) => {
    const progress = { report: jest.fn() };
    return task(progress, defaultToken);
  }),
  registerTreeDataProvider: jest.fn(),
};

export const workspace = {
  workspaceFolders: [{}] as any[],
  findFiles: jest.fn(async (_include?: string, _exclude?: string | null) => {
    return [] as Array<Uri>;
  }),
  getConfiguration: jest.fn(() => ({ get: jest.fn(() => undefined), update: jest.fn() })),
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
  window,
  workspace,
  commands,
  env,
};

