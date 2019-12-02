"use strict";
import { commands, window, languages, ExtensionContext, Disposable } from "vscode";
import { TSCodeLensProvider } from "./TSCodeLensProvider";

export function activate(context: ExtensionContext) {
	const provider = new TSCodeLensProvider();
	const triggerCodeLensComputation = () => {
		if (!window.activeTextEditor) return;
		var end = window.activeTextEditor.selection.end;
		window.activeTextEditor
			.edit(editbuilder => editbuilder.insert(end, " "))
			.then(() => {
				commands.executeCommand("undo");
			});
	};
	const disposables: Disposable[] = context.subscriptions;
	disposables.push(
		commands.registerCommand("typelens.toggle", () => {
			provider.config.typeLensEnabled = !provider.config.typeLensEnabled;
			triggerCodeLensComputation();
		})
	);
	disposables.push(languages.registerCodeLensProvider(["*"], provider));
	disposables.push(
		window.onDidChangeActiveTextEditor(editor => {
			if (editor) {
				provider.updateDecorations(editor.document.uri);
			}
		})
	);
}
