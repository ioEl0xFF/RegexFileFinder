// 最低限の VS Code API モック
export const ProgressLocation = {
  Notification: 15,
} as const;

class UriImpl {
  constructor(public readonly fsPath: string) {}
  static file(path: string): UriImpl { return new UriImpl(path); }
  toString(): string { return this.fsPath; }
}

export const Uri = UriImpl as unknown as typeof import('vscode').Uri;

export const ThemeIcon = {
  Folder: 'folder',
} as any;

let _workspaceFolders: Array<{ uri: typeof UriImpl }> | undefined = [{ uri: Uri.file('/workspace') } as any];

export const workspace = {
  workspaceFolders: _workspaceFolders as any,
  getConfiguration: () => ({
    get: (_key: string, def?: any) => def,
    update: async () => {},
  }),
  onDidChangeConfiguration: () => ({ dispose: () => {} }),
  findFiles: async (_include?: string, _exclude?: string | null) => {
    return [] as any;
  },
};

export const window = {
  showErrorMessage: async (_message: string) => {},
  showWarningMessage: async (_message: string) => {},
  showInformationMessage: async (_message: string) => {},
  withProgress: async (_opts: any, task: any) => task({ report() {} }, { onCancellationRequested() {}, isCancellationRequested: false }),
  createTreeView: () => ({ reveal: async () => {}, dispose: () => {} }),
  registerWebviewViewProvider: () => ({ dispose: () => {} }),
};

export const commands = {
  executeCommand: async (_cmd: string) => {},
};

export const EventEmitter = class<T> {
  public event = (_listener?: any) => {};
  fire(_data?: T) {}
  dispose() {}
};

export const TreeItemCollapsibleState = {
  None: 0,
  Collapsed: 1,
  Expanded: 2,
} as const;

export type Disposable = { dispose(): void };
