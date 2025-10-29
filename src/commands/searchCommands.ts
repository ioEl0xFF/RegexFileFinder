import * as vscode from 'vscode';
import { SearchTreeProvider } from '../providers/searchTreeProvider';
import { ErrorHandler } from '../services/errorHandler';
import { RegexValidator } from '../utils/regexValidator';

/**
 * 検索関連のコマンドを登録
 */
export function registerSearchCommands(
  context: vscode.ExtensionContext,
  treeProvider: SearchTreeProvider
): void {
  console.log('[SearchCommands] コマンド登録開始');
  
  // 検索文字列編集
  context.subscriptions.push(
    vscode.commands.registerCommand('regexFileFinder.editSearchPattern', async () => {
      console.log('[SearchCommands] 検索文字列編集コマンド実行');
      
      const result = await ErrorHandler.handleAsync(async () => {
        const pattern = await vscode.window.showInputBox({
          prompt: '検索文字列を入力してください（正規表現）',
          placeHolder: '例: .*\\.tsx$',
          validateInput: (value) => {
            const validation = RegexValidator.validate(value || '');
            return validation.isValid ? null : validation.error || '無効なパターンです';
          }
        });
        
        if (pattern !== undefined) {
          await treeProvider.updateSearchPattern(pattern);
          await treeProvider.executeSearch(); // 検索を自動実行
        }
      }, 'SearchCommands.editSearchPattern');
      
      if (!result) {
        console.warn('[SearchCommands] 検索文字列編集がキャンセルされました');
      }
    })
  );

  // 含めるファイル編集
  context.subscriptions.push(
    vscode.commands.registerCommand('regexFileFinder.editIncludePattern', async () => {
      console.log('[SearchCommands] 含めるファイル編集コマンド実行');
      
      const result = await ErrorHandler.handleAsync(async () => {
        const pattern = await vscode.window.showInputBox({
          prompt: '含めるファイルのパターンを入力（グロブパターン）',
          placeHolder: '例: **/*.ts または空欄で **/*',
          validateInput: (value) => {
            if (!value || value.trim() === '') {
              return null; // 空は許可
            }
            // 基本的なグロブパターンの検証
            if (value.includes('\\')) {
              return 'バックスラッシュは使用できません。スラッシュ(/)を使用してください';
            }
            return null;
          }
        });
        
        if (pattern !== undefined) {
          await treeProvider.updateIncludePattern(pattern);
        }
      }, 'SearchCommands.editIncludePattern');
      
      if (!result) {
        console.warn('[SearchCommands] 含めるファイル編集がキャンセルされました');
      }
    })
  );

  // 除外するファイル編集
  context.subscriptions.push(
    vscode.commands.registerCommand('regexFileFinder.editExcludePattern', async () => {
      console.log('[SearchCommands] 除外するファイル編集コマンド実行');
      
      const result = await ErrorHandler.handleAsync(async () => {
        const pattern = await vscode.window.showInputBox({
          prompt: '除外するファイルのパターンを入力（グロブパターン）',
          placeHolder: '例: **/node_modules/**',
          validateInput: (value) => {
            if (!value || value.trim() === '') {
              return null; // 空は許可
            }
            // 基本的なグロブパターンの検証
            if (value.includes('\\')) {
              return 'バックスラッシュは使用できません。スラッシュ(/)を使用してください';
            }
            return null;
          }
        });
        
        if (pattern !== undefined) {
          await treeProvider.updateExcludePattern(pattern);
        }
      }, 'SearchCommands.editExcludePattern');
      
      if (!result) {
        console.warn('[SearchCommands] 除外するファイル編集がキャンセルされました');
      }
    })
  );

  // 検索実行
  context.subscriptions.push(
    vscode.commands.registerCommand('regexFileFinder.executeSearch', async () => {
      console.log('[SearchCommands] 検索実行コマンド実行');
      
      await ErrorHandler.handleAsync(async () => {
        await treeProvider.executeSearch();
      }, 'SearchCommands.executeSearch');
    })
  );

  // 検索結果クリア
  context.subscriptions.push(
    vscode.commands.registerCommand('regexFileFinder.clearResults', async () => {
      console.log('[SearchCommands] 検索結果クリアコマンド実行');
      
      await ErrorHandler.handleAsync(async () => {
        treeProvider.clearResults();
        await ErrorHandler.showInfo('検索結果をクリアしました');
      }, 'SearchCommands.clearResults');
    })
  );

  // 正規表現の例を表示
  context.subscriptions.push(
    vscode.commands.registerCommand('regexFileFinder.showExamples', async () => {
      console.log('[SearchCommands] 正規表現例表示コマンド実行');
      
      const examples = RegexValidator.generateExamples();
      const exampleText = examples.map((example, index) => 
        `${index + 1}. \`${example}\` - ${RegexValidator.generateDescription(example)}`
      ).join('\n');
      
      const message = `正規表現の例:\n\n${exampleText}\n\nこれらの例を参考に検索パターンを入力してください。`;
      
      await vscode.window.showInformationMessage(message, { modal: true });
    })
  );
  
  console.log('[SearchCommands] コマンド登録完了');
}
