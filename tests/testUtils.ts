import { Uri } from 'vscode';

export function uri(p: string): Uri {
  return Uri.file(p);
}

export async function flushMicrotasks(): Promise<void> {
  return Promise.resolve();
}

export function makeArray(n: number, map: (i: number) => string): string[] {
  return Array.from({ length: n }, (_, i) => map(i));
}


