import { SymbolKind } from "vscode";

export const standardSymbolKindSet = [
  SymbolKind.Method,
  SymbolKind.Function,
  SymbolKind.Property,
  SymbolKind.Class,
  SymbolKind.Interface,
  SymbolKind.Variable,
];

export const cssSymbolKindSet = [SymbolKind.Method, SymbolKind.Function, SymbolKind.Property, SymbolKind.Variable];

export const SymbolKindInterst: Record<string, SymbolKind[]> = {
  scss: cssSymbolKindSet,
  less: cssSymbolKindSet,
  typescript: [...standardSymbolKindSet, SymbolKind.Enum],
  typescriptreact: [...standardSymbolKindSet, SymbolKind.Enum],
  javascript: standardSymbolKindSet
};