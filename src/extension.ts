// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "powershell-in-kotlin-dsl" is now active!');

	async function openInUntitled(content: string, language?: string) {
		const document = await vscode.workspace.openTextDocument({
			language,
			content,
		});
		vscode.window.showTextDocument(document);
	}

	function escapeSpecialCharacters(text: string, escape: boolean = true): string {
		const escapeMap: Record<string, string> = {
			'$': '\\$'
		};
	
		if (escape) {
			return text.replace(/[\\^$*+?.()|[\]{}\/]/g, match => escapeMap[match] || match);
		} else {
			const reverseEscapeMap: Record<string, string> = {};
			for (const key in escapeMap) {
				if (Object.prototype.hasOwnProperty.call(escapeMap, key)) {
					reverseEscapeMap[escapeMap[key]] = key;
				}
			}
			return text.replace(/\\([\\^$*+?.()|[\]{}\/])/g, (match, escapedChar) => reverseEscapeMap[match] || match);
		}
	}

	function parsePowershell(content: string, toPowershell: boolean) {
		const kotlinToPowershell: Record<string, string> = {
			"${'$'}": "$",
			"${.*?}": ""
		}

		const powershellToKotlin: Record<string, string> = {
			"$": "${'$'}"
		}

		var mapping: Record <string, string>
		if (toPowershell) {
			mapping = kotlinToPowershell
		} else {
			mapping = powershellToKotlin
		}

		let pattern = '';
		const keys = Object.keys(mapping);

		for (let i = 0; i < keys.length; i++) {
			const key = escapeSpecialCharacters(keys[i]);
			pattern += key + '|';
		}
		// Remove the last '|'
		pattern = pattern.slice(0, -1); 
	
		const patternRegExp = new RegExp(pattern, 'g');
		var output = content.replace(patternRegExp, match => mapping[match] || `<# --- ${match} --- #>`);
		return output;
	}

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('powershell-in-kotlin-dsl.pwshInNewWindow', async () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		const editor = vscode.window.activeTextEditor;
		const selection = editor.selection;
		var highlightedText = "Nothing";
		if (selection && !selection.isEmpty) {
			const selectionRange = new vscode.Range(selection.start.line, selection.start.character, selection.end.line, selection.end.character);
			highlightedText = editor.document.getText(selectionRange);
		}
		
		var parsedScript = parsePowershell(highlightedText, true);
		openInUntitled(parsedScript, "powershell");
		vscode.window.showInformationMessage(`You selected:\n${ parsedScript }`);
	});

	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
