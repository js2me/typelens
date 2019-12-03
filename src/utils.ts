import { SymbolInformation, DocumentSymbol, Range, SymbolKind, window, TextDocument, Position } from "vscode";
import { SymbolKindInterst, standardSymbolKindSet } from "./constants";
import { AppConfiguration } from "./AppConfiguration";



export type LensSymbol = SymbolInformation | DocumentSymbol
export type FlattenSymbol = Pick<LensSymbol, "kind" | "name"> & { range: Range }

export const getFlattenSymbols = (symbols?: LensSymbol[]) => {
  if (!symbols) return []

  const flattenedSymbols: FlattenSymbol[] = [];

  const walk = (symbol: DocumentSymbol) => {
    if (symbol.children.length) symbol.children.forEach(walk);
    flattenedSymbols.push(symbol);
  };

  for (let i = 0; i < symbols.length; i++) {
    const symbol = symbols[i];
    if (isDocumentSymbol(symbol)) {
      walk(symbol);
    } else if (symbol.location) {
      flattenedSymbols.push({
        kind: symbol.kind,
        name: symbol.name,
        range: symbol.location.range
      });
    }
  }

  return flattenedSymbols;
}


export const isDocumentSymbol = (symbol: LensSymbol): symbol is DocumentSymbol =>
  (symbol as DocumentSymbol).children != null


export const symbolTypeSpecificChecks: Partial<Record<SymbolKind, (name: string, range: Range, document: TextDocument) => boolean | void>> = {
  [SymbolKind.Variable]: (name, range, document) => {
    if (document.languageId === "typescript" || document.languageId === "typescriptreact") {
      const text = document.getText(new Range(new Position(range.start.line, 0), range.end));
      return !range.start.character || (!text.indexOf('type') || !text.indexOf('export') || (range.start.character === 6 && !text.indexOf('const')));
    }
    return false
  }
}

export const isSymbolSupportReferences = (
  { name, kind, range }: FlattenSymbol,
  document: TextDocument,
  { settings }: AppConfiguration
) => {
  if (!name || !range) return false

  const knownInterest = SymbolKindInterst[document.languageId] || standardSymbolKindSet;

  const isKnownInterest = knownInterest.indexOf(kind) > -1;
  if (!isKnownInterest) return false;

  const isSymbolKindAllowed =
    kind === SymbolKind.Method && settings.showReferencesForMethods ||
    kind === SymbolKind.Function && settings.showReferencesForFunctions ||
    kind === SymbolKind.Property && settings.showReferencesForProperties ||
    kind === SymbolKind.Class && settings.showReferencesForClasses ||
    kind === SymbolKind.Interface && settings.showReferencesForInterfaces ||
    kind === SymbolKind.Enum && settings.showReferencesForEnums ||
    kind === SymbolKind.Variable && settings.showReferencesForVariables;

  const isUnsupportedSymbol =
    name.indexOf('.') > -1 ||
    name == "<function>" ||
    name.endsWith(" callback") ||
    settings.ignorelist.indexOf(name) > -1;

  return isSymbolKindAllowed && !isUnsupportedSymbol && (!symbolTypeSpecificChecks[kind] || symbolTypeSpecificChecks[kind](name, range, document));
}