"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = __importStar(require("vscode"));
// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
function activate(context) {
    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "powershell-in-kotlin-dsl" is now active!');
    async function openNewWindow(content, language) {
        const document = await vscode.workspace.openTextDocument({
            language,
            content,
        });
        vscode.window.showTextDocument(document);
    }
    async function openOldWindow(uri) {
        const document = await vscode.workspace.openTextDocument(uri);
        vscode.window.showTextDocument(document);
    }
    function escapeSpecialCharacters(text, escape = true) {
        const escapeMap = {
            '$': '\\$'
        };
        if (escape) {
            return text.replace(/[\\^$*+?.()|[\]{}\/]/g, match => escapeMap[match] || match);
        }
        else {
            const reverseEscapeMap = {};
            for (const key in escapeMap) {
                if (Object.prototype.hasOwnProperty.call(escapeMap, key)) {
                    reverseEscapeMap[escapeMap[key]] = key;
                }
            }
            return text.replace(/\\([\\^$*+?.()|[\]{}\/])/g, (match, escapedChar) => reverseEscapeMap[match] || match);
        }
    }
    function parseScript(content, toPowershell) {
        const kotlinToPowershell = {
            "${'$'}": "$",
            "${.*?}": ""
        };
        const powershellToKotlin = {
            "$": "${'$'}",
            "<# --- ${": "${",
            "} --- #>": "}"
        };
        var mapping;
        if (toPowershell) {
            mapping = kotlinToPowershell;
        }
        else {
            mapping = powershellToKotlin;
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
    function getReturnInfo(content) {
        var match = content.match(/(<@(.*?)@> <#sl(.*?);sc(.*?);el(.*?);ec(.*?)#>)/);
        return match;
    }
    // The command has been defined in the package.json file
    // Now provide the implementation of the command with registerCommand
    // The commandId parameter must match the command field in package.json
    let disposable = vscode.commands.registerCommand('powershell-in-kotlin-dsl.pwshInNewWindow', async () => {
        // The code you place here will be executed every time your command is executed
        // Display a message box to the user
        const editor = vscode.window.activeTextEditor;
        const selection = editor?.selection;
        const currentFileName = editor?.document.fileName;
        var highlightedText = "Nothing";
        var fileLanguage = editor?.document.languageId;
        var selectionRange;
        if (selection && !selection.isEmpty) {
            selectionRange = new vscode.Range(selection.start.line, selection.start.character, selection.end.line, selection.end.character);
            highlightedText = editor?.document.getText(selectionRange);
        }
        if (fileLanguage == "kotlin") {
            highlightedText += `\n\n\n### DO NOT DELETE <@${currentFileName}@> <#sl${selectionRange?.c.c};sc${selectionRange?.c.e};el${selectionRange?.e.c};ec${selectionRange?.e.e}#> DO NOT DELETE ###`;
        }
        var parsedScript = "";
        if (fileLanguage == "kotlin") {
            var parsedScript = parseScript(highlightedText, true);
            openNewWindow(parsedScript, "powershell");
            vscode.window.showInformationMessage("Opened in Kotlin");
        }
        else if (fileLanguage == "powershell") {
            var parsedScript = parseScript(highlightedText, false);
            var returnInfo = getReturnInfo(parsedScript);
            var filePath = vscode.Uri.parse(`file:///${returnInfo[2]}`);
            var originalSelection = new vscode.Range(parseInt(returnInfo[3]), parseInt(returnInfo[4]), parseInt(returnInfo[5]), parseInt(returnInfo[6]));
            openOldWindow(filePath);
            vscode.window.activeTextEditor?.insertSnippet(new vscode.SnippetString(parsedScript), originalSelection);
            vscode.window.showInformationMessage("Opened in Powershell");
        }
    });
    context.subscriptions.push(disposable);
}
exports.activate = activate;
// This method is called when your extension is deactivated
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map