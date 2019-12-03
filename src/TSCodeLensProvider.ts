import * as vscode from 'vscode';
import {
  CancellationToken,
  CodeLens,
  Range,
  Command,
  Location,
  commands
} from "vscode";
import { Minimatch } from "minimatch";
import { AppConfiguration } from "./AppConfiguration";
import { LensSymbol, getFlattenSymbols, isSymbolSupportReferences, symbolTypeSpecificChecks } from './utils';

class UnusedDecoration {
  ranges: vscode.Range[] = [];
  decoration: vscode.TextEditorDecorationType;
}

class MethodReferenceLens extends CodeLens {
  constructor(range: Range, public uri: vscode.Uri, public name: string, command?: Command) {
    super(range, command);
  }
}

export class TSCodeLensProvider implements vscode.CodeLensProvider {
  config: AppConfiguration;

  private unusedDecorations: Map<string, UnusedDecoration> = new Map();

  constructor() {
    this.config = new AppConfiguration();
  }

  reinitDecorations() {
    const settings = this.config.settings;
    const editor = vscode.window.activeTextEditor;
    if (editor != null) {
      if (this.unusedDecorations.has(editor.document.uri.fsPath)) {
        const unusedDecoration: UnusedDecoration = this.unusedDecorations.get(editor.document.uri.fsPath);
        let decoration = unusedDecoration.decoration;
        if (unusedDecoration.ranges.length > 0 && decoration) {
          editor.setDecorations(decoration, unusedDecoration.ranges);
        }
        decoration.dispose();
        decoration = null;
      }

      if (settings.decorateunused) {
        var unusedDecoration = new UnusedDecoration();
        this.unusedDecorations.set(editor.document.uri.fsPath, unusedDecoration);
        unusedDecoration.decoration = vscode.window.createTextEditorDecorationType({
          color: settings.unusedcolor
        });
      }
    }
  }
  provideCodeLenses(document: vscode.TextDocument, token: vscode.CancellationToken): CodeLens[] | Thenable<CodeLens[]> {
    const settings = this.config.settings;
    this.reinitDecorations();
    if (!this.config.typeLensEnabled || settings.skiplanguages.indexOf(document.languageId) > -1) {
      return;
    }

    return vscode.commands
      .executeCommand<LensSymbol[]>("vscode.executeDocumentSymbolProvider", document.uri)
      .then(symbols => {
        var usedPositions = [];

        return getFlattenSymbols(symbols).reduce((references, symbolInfo) => {
          if (isSymbolSupportReferences(symbolInfo, document, this.config)) {
            const symbolText = document.getText(symbolInfo.range);
            const documentOffset = document.offsetAt(symbolInfo.range.start);

            let leftMatch: Range;
            let rightMatch: Range;

            if (symbolText.indexOf(symbolInfo.name) > -1) {
              const maxOffset = documentOffset + symbolText.length;
              let lookupOffset = documentOffset;
              while (lookupOffset < maxOffset) {
                const start = document.positionAt(lookupOffset);
                const wordRange = document.getWordRangeAtPosition(start);
                if (wordRange && document.getText(wordRange) == symbolInfo.name) {
                  rightMatch = wordRange;
                  break;
                } else {
                  lookupOffset += symbolInfo.name.length;
                }
              }
            } else {
              const minOffset = Math.max(documentOffset - symbolText.length, 0);
              let lookupOffset = documentOffset;
              while (lookupOffset > minOffset) {
                const start = document.positionAt(lookupOffset);
                const wordRange = document.getWordRangeAtPosition(start);
                if (wordRange && document.getText(wordRange) == symbolInfo.name) {
                  leftMatch = wordRange;
                  break;
                } else {
                  lookupOffset -= symbolInfo.name.length;
                }
              }
            }
            let resultingRange;
            if (leftMatch == null && rightMatch == null) {
              resultingRange = symbolInfo.range;
            } else
              if (leftMatch != null && rightMatch == null) {
                resultingRange = leftMatch;
              } else if (leftMatch == null && rightMatch != null) {
                resultingRange = rightMatch;
              } else {
                resultingRange =
                  documentOffset - document.offsetAt(leftMatch.start) < document.offsetAt(rightMatch.start) - documentOffset
                    ? leftMatch
                    : rightMatch;
              }

            const position = document.offsetAt(resultingRange.start);

            if (!usedPositions[position]) {
              usedPositions[position] = 1;
              references.push(new MethodReferenceLens(resultingRange, document.uri, symbolInfo.name));
            }
          }

          return references
        }, [])
      });
  }
  resolveCodeLens(codeLens: CodeLens, token: CancellationToken): CodeLens | Thenable<CodeLens> {
    if (codeLens instanceof MethodReferenceLens) {
      return commands
        .executeCommand<Location[]>("vscode.executeReferenceProvider", codeLens.uri, codeLens.range.start)
        .then(locations => {
          var settings = this.config.settings;
          var filteredLocations = locations;
          if (settings.excludeself) {
            filteredLocations = locations.filter(location => {
              const isSameDocument = codeLens.uri.toString() == location.uri.toString();
              const isLocationOverlaps = codeLens.range.contains(location.range);
              const overlapsWithOriginalSymbol = isSameDocument && isLocationOverlaps;
              return !overlapsWithOriginalSymbol;
            });
          }

          const blackboxList = this.config.settings.blackbox || [];
          const nonBlackBoxedLocations = filteredLocations.filter(location => {
            const fileName = location.uri.path;
            return !blackboxList.some(pattern => new Minimatch(pattern).match(fileName));
          });

          var isSameDocument = codeLens.uri == vscode.window.activeTextEditor.document.uri;
          var message;
          var amount = nonBlackBoxedLocations.length;
          if (amount == 0) {
            message = settings.noreferences;
            message = message.replace("{0}", codeLens.name + "");
          } else if (amount == 1) {
            message = settings.singular;
            message = message.replace("{0}", amount + "");
          } else {
            message = settings.plural;
            message = message.replace("{0}", amount + "");
          }

          if (amount == 0 && filteredLocations.length == 0 && isSameDocument && settings.decorateunused) {
            if (this.unusedDecorations.has(codeLens.uri.fsPath)) {
              var decorationsForFile = this.unusedDecorations.get(codeLens.uri.fsPath);
              decorationsForFile.ranges.push(codeLens.range);
              this.updateDecorations(codeLens.uri);
            }
          }
          if (amount == 0 && filteredLocations.length != 0) {
            return new CodeLens(
              new vscode.Range(codeLens.range.start.line, codeLens.range.start.character, codeLens.range.start.line, 90000),
              {
                command: "",
                title: settings.blackboxTitle
              }
            );
          } else if (amount > 0) {
            return new CodeLens(
              new vscode.Range(codeLens.range.start.line, codeLens.range.start.character, codeLens.range.start.line, 90000),
              {
                command: "editor.action.showReferences",
                title: message,
                arguments: [codeLens.uri, codeLens.range.start, nonBlackBoxedLocations]
              }
            );
          } else {
            return new CodeLens(
              new vscode.Range(codeLens.range.start.line, codeLens.range.start.character, codeLens.range.start.line, 90000),
              {
                command: "editor.action.findReferences",
                title: message,
                arguments: [codeLens.uri, codeLens.range.start]
              }
            );
          }
        });
    }
  }
  updateDecorations(uri: vscode.Uri) {
    var isSameDocument = uri == vscode.window.activeTextEditor.document.uri;
    if (isSameDocument) {
      if (this.unusedDecorations.has(uri.fsPath)) {
        var unusedDecoration = this.unusedDecorations.get(uri.fsPath);
        var decoration = unusedDecoration.decoration;
        var unusedDecorations = unusedDecoration.ranges;
        vscode.window.activeTextEditor.setDecorations(decoration, unusedDecorations);
      }
    }
  }
}