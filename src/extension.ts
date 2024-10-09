import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
	console.log('"powershell-in-kotlin-dsl is active!');

	async function openNewWindow(content: string, language?: string) {
		const document = await vscode.workspace.openTextDocument({
			language,
			content,
		});
		vscode.window.showTextDocument(document);
	}

	async function openOldWindow(uri: string) {
		var currentEditor = vscode.window.activeTextEditor;

		if (currentEditor == null) {
			throw new Error("Cannot find current Editor");
		} else if (currentEditor.document.isUntitled) {
			var deleteSelection = currentEditor.selection;
			await currentEditor?.edit(editBuilder => editBuilder.delete(deleteSelection));
			await vscode.commands.executeCommand("workbench.action.closeActiveEditor",);
		}

		const document = await vscode.workspace.openTextDocument(uri);
		await vscode.window.showTextDocument(document);
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

	function parseScript(content: string, toPowershell: boolean) {
		const kotlinToPowershell: Record<string, string> = {
			"${'$'}": "$",
			"${.*?}": ""
		};

		const powershellToKotlin: Record<string, string> = {
			"$": "${'$'}",
			"<# --- ${": "${",
			"} --- #>": "}"
		};

		var mapping: Record <string, string>;
		if (toPowershell) {
			mapping = kotlinToPowershell;
		} else {
			mapping = powershellToKotlin;
		}

		let pattern = '';
		const keys = Object.keys(mapping);

		for (let i = 0; i < keys.length; i++) {
			const key = escapeSpecialCharacters(keys[i]);
			pattern += key + '|';
		}
		// Remove the last pipe
		pattern = pattern.slice(0, -1); 
	
		const patternRegExp = new RegExp(pattern, 'g');
		var output = content.replace(patternRegExp, match => mapping[match] || `<# --- ${match} --- #>`);

		if(!toPowershell) {
			return removeReturnInfo(output.replaceAll("\\$","\\\\$"));
		} else {
			return output;
		}
	}

	function getReturnInfo(content: String) {
		var match = content.match(/(<@(.*?)@> <#sl(.*?);sc(.*?);el(.*?);ec(.*?)#>)/);
		return match;
	}

	function removeReturnInfo(content: String) {
		var match = content.match(/### DO NOT DELETE .* DO NOT DELETE ###/);
		var substring = "";
		if(match !== null) {
			var substring = match[0];
		}
		return content.replace(substring, "").trimEnd();
	}

	let disposable = vscode.commands.registerCommand('powershell-in-kotlin-dsl.pwshInNewWindow', async () => {
		const editor = vscode.window.activeTextEditor;

		if (editor == null) {
			throw new Error("Cannot get editor");
		}

		var selection = editor.selection;
		const currentFileName = editor?.document.fileName;
		var highlightedText = "Nothing";
		var fileLanguage = editor?.document.languageId;

		if (selection && !selection.isEmpty) {
			highlightedText = editor?.document.getText(selection);
		} else if (fileLanguage === "kotlin" && selection.isEmpty) {
			var cursorIndex = editor.document.offsetAt(selection.active);
			var fullScript = editor.document.getText();

			var quoteIndexes = [...fullScript.toString().matchAll(new RegExp('"""', 'gi'))].map(charactersPosition => charactersPosition.index)

			var startIndex;
			var endIndex;
			for (const index of quoteIndexes) {
				if(index < cursorIndex) {
					startIndex = index + 3; // Need to offset triple quotes
				} else if(index > cursorIndex) {
					endIndex = index - 1;
					break;
				}
			}

			if(startIndex == null || endIndex == null) {
				throw new Error("Cannot find start or end index")
			}
			console.log("StartIndex is: " + startIndex)
			console.log("EndIndex is: " + endIndex)
			console.log("Finished Finding Start and End indexes")

			var startPosition = editor.document.positionAt(startIndex);
			var endPosition = editor.document.positionAt(endIndex);

			selection = new vscode.Selection(startPosition, endPosition)
			highlightedText = editor.document.getText(selection);
		}

		if(highlightedText == "Nothing") {
			throw new Error("Couldn't find any selection aborting")
		}


		if (fileLanguage === "kotlin") {
			highlightedText += `\n\n\n### DO NOT DELETE <@${currentFileName}@> <#sl${selection.start.line};sc${selection.start.character};el${selection.end.line};ec${selection.end.character}#> DO NOT DELETE ###`;
		}

		var parsedScript = "";
		if (fileLanguage === "kotlin") {
			var parsedScript = parseScript(highlightedText, true);
			openNewWindow(parsedScript, "powershell");
			vscode.window.showInformationMessage("Opened in Kotlin");
		} else if (fileLanguage === "powershell") {
			var parsedScript = parseScript(highlightedText, false);
			var returnInfo = getReturnInfo(highlightedText);

			if(returnInfo === null) {
				throw new Error("Return Info is empty");
			} 

			var filePath = returnInfo[2]
			var originalSelection = new vscode.Range(parseInt(returnInfo[3]), parseInt(returnInfo[4]), parseInt(returnInfo[5]), parseInt(returnInfo[6]));

			await openOldWindow(filePath);
			var snippet = new vscode.SnippetString(parsedScript);
			vscode.window.activeTextEditor?.insertSnippet(snippet, originalSelection);
			vscode.window.showInformationMessage("Opened in Powershell");
		}
	});

	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
