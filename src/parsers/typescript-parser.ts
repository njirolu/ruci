import {
  createSourceFile,
  ScriptTarget,
  isCallExpression,
  isPropertyAccessExpression,
  isElementAccessExpression,
  isStringLiteral,
  isArrayLiteralExpression,
  isIdentifier,
  SyntaxKind,
  forEachChild,
  type Expression,
  type CallExpression,
  type ElementAccessExpression,
  type SourceFile,
  type Node,
} from "typescript";

import {
  isValidTranslationKey,
  mapVariablesFromTypeScriptAST,
} from "@/core/services/key-extractor";
import type { TranslationUsage } from "@/types/translation";

/**
 * A map holding variable names as keys and their resolved string literal values.
 * Used to resolve variables to static strings for key extraction.
 * Example: `Map { 'pageTitle' => 'PAGES.HOME.TITLE' }`
 */
import type { VariableValueMap } from "@/types/parser";

/**
 * Extracts translation keys from TypeScript content using the TypeScript compiler API.
 * Falls back to a regex-based approach if AST parsing fails.
 *
 * @param tsContent - The string content of the TypeScript file.
 * @param filePath - The path of the TypeScript file.
 * @returns An array of found translation usages.
 */
export function extractKeysFromTypeScriptContent(
  tsContent: string,
  filePath: string,
): TranslationUsage[] {
  try {
    const sourceFile = createSourceFile(
      filePath,
      tsContent,
      ScriptTarget.Latest,
      true,
    );
    const variableMap = mapVariablesFromTypeScriptAST(sourceFile);
    const usages: TranslationUsage[] = [];

    traverseTypeScriptAst(
      sourceFile,
      sourceFile,
      variableMap,
      usages,
      filePath,
    );
    return usages;
  } catch (error) {
    console.warn(
      `🟡 TypeScript AST parser failed for ${filePath}. Falling back to regex analysis.`,
      error,
    );
    // Fallback to regex if the AST parser throws a critical error.
    return extractTypeScriptKeysWithRegex(tsContent, filePath);
  }
}

/**
 * Recursively traverses the TypeScript AST to find translation service calls.
 *
 * @param sourceFile - The root AST node of the file.
 * @param node - The current AST node to inspect.
 * @param variableMap - A map of resolved variable values.
 * @param usages - The array to push found usages into.
 * @param filePath - The path of the file being processed.
 */
function traverseTypeScriptAst(
  sourceFile: SourceFile,
  node: Node,
  variableMap: VariableValueMap,
  usages: TranslationUsage[],
  filePath: string,
): void {
  // Target: A method call expression, e.g., `service.method()`.
  if (isCallExpression(node)) {
    analyzeTranslateServiceCall(
      node,
      sourceFile,
      variableMap,
      usages,
      filePath,
    );
  }

  // Target: Property access with an argument, e.g., `translations['key']`.
  if (isElementAccessExpression(node)) {
    analyzeTranslationObjectAccess(node, sourceFile, usages, filePath);
  }

  // Continue traversal to all children of the current node.
  forEachChild(node, (childNode) =>
    traverseTypeScriptAst(sourceFile, childNode, variableMap, usages, filePath),
  );
}

/**
 * Analyzes a `ts.CallExpression` to see if it's a call to the translation service.
 * Handles `translate.get('key')` and `translate.instant('key')`.
 *
 * @param callNode - The AST node for the call expression.
 * @param sourceFile - The complete source file for line number lookups.
 * @param variableMap - The map for resolving variable identifiers.
 * @param usages - The array to push found usages into.
 * @param filePath - The path of the file.
 */
function analyzeTranslateServiceCall(
  callNode: CallExpression,
  sourceFile: SourceFile,
  variableMap: VariableValueMap,
  usages: TranslationUsage[],
  filePath: string,
): void {
  if (!isPropertyAccessExpression(callNode.expression)) return;

  const methodName = callNode.expression.name.text;
  const isTranslateMethod = methodName === "get" || methodName === "instant";
  if (!isTranslateMethod) return;

  const firstArgument = callNode.arguments[0];
  if (!firstArgument) return;

  const lineNumber =
    sourceFile.getLineAndCharacterOfPosition(callNode.getStart()).line + 1;

  const keysToPush = getKeysFromTranslateArgument(firstArgument, variableMap);

  for (const key of keysToPush) {
    if (isValidTranslationKey(key)) {
      usages.push({ key, filePath, lineNumber, fileType: "typescript" });
    }
  }
}

/**
 * Resolves the argument of a translate service call to one or more key strings.
 *
 * @param argNode - The argument node from the call expression.
 * @param variableMap - The map for resolving variable identifiers.
 * @returns An array of resolved key strings.
 */
function getKeysFromTranslateArgument(
  argNode: Expression,
  variableMap: VariableValueMap,
): string[] {
  // Case 1: `translate.get('KEY')`
  if (isStringLiteral(argNode)) {
    return [argNode.text];
  }

  // Case 2: `translate.get(['KEY1', 'KEY2'])`
  if (isArrayLiteralExpression(argNode)) {
    return argNode.elements
      .filter(isStringLiteral)
      .map((element) => element.text);
  }

  // Case 3: `translate.get(myVariable)` or `translate.get(this.myProperty)`
  let variableName: string | undefined;
  if (isIdentifier(argNode)) {
    variableName = argNode.text;
  } else if (
    isPropertyAccessExpression(argNode) &&
    argNode.expression.kind === SyntaxKind.ThisKeyword
  ) {
    variableName = argNode.name.text;
  }

  if (variableName) {
    const resolvedValue = variableMap.get(variableName);
    return resolvedValue ? [resolvedValue] : [];
  }

  return [];
}

/**
 * Analyzes a `ts.ElementAccessExpression` (`object['property']`) to see if it's
 * accessing a key from a known translations object.
 *
 * @param accessNode - The AST node for the element access.
 * @param sourceFile - The complete source file for line number lookups.
 * @param usages - The array to push found usages into.
 * @param filePath - The path of the file.
 */
function analyzeTranslationObjectAccess(
  accessNode: ElementAccessExpression,
  sourceFile: SourceFile,
  usages: TranslationUsage[],
  filePath: string,
): void {
  const commonTranslationObjectNames = [
    "translations",
    "res",
    "result",
    "translation",
    "trans",
  ];

  if (isIdentifier(accessNode.expression)) {
    const objectName = accessNode.expression.text;

    if (commonTranslationObjectNames.includes(objectName.toLowerCase())) {
      const keyNode = accessNode.argumentExpression;

      if (keyNode && isStringLiteral(keyNode)) {
        const key = keyNode.text;
        if (isValidTranslationKey(key)) {
          const lineNumber =
            sourceFile.getLineAndCharacterOfPosition(accessNode.getStart())
              .line + 1;
          usages.push({ key, filePath, lineNumber, fileType: "typescript" });
        }
      }
    }
  }
}

/**
 * Fallback function to extract keys from TypeScript using regular expressions.
 *
 * @param tsContent The content of the TypeScript file.
 * @param filePath The path of the file.
 * @returns An array of found translation usages.
 */
function extractTypeScriptKeysWithRegex(
  tsContent: string,
  filePath: string,
): TranslationUsage[] {
  const usages: TranslationUsage[] = [];
  const variableMap = mapVariablesWithRegex(tsContent);
  const contentLines = tsContent.split("\n");

  // Regex for `translate.get('key')` or `translate.instant(variable)`
  const translateCallPattern =
    /translate\.(?:get|instant)\((['"`]([^'"`]+)['"`]|([a-zA-Z_$][\w$]*))\)/g;

  contentLines.forEach((line, index) => {
    let match: RegExpExecArray | null;
    match = translateCallPattern.exec(line);
    while (match !== null) {
      const stringLiteralKey = match[2];
      const variableNameKey = match[3];
      let resolvedKey: string | null = null;

      if (stringLiteralKey) {
        resolvedKey = stringLiteralKey;
      } else if (variableNameKey) {
        resolvedKey = variableMap.get(variableNameKey) ?? null;
      }

      if (resolvedKey && isValidTranslationKey(resolvedKey)) {
        usages.push({
          key: resolvedKey,
          filePath: filePath,
          lineNumber: index + 1,
          fileType: "typescript",
        });
      }
    }
  });
  return usages;
}

/**
 * Fallback function to map variables using regular expressions.
 * Less precise but useful when AST parsing fails.
 *
 * @param content The source code content.
 * @returns A `VariableValueMap`.
 */
function mapVariablesWithRegex(content: string): VariableValueMap {
  const variableMap: VariableValueMap = new Map();
  // `const/let/var name = "value"` or `public name = 'value'`
  const varPattern =
    /(?:const|let|var|public|private|protected)\s+([a-zA-Z_$][\w$]*)\s*=\s*['"`]([^'"`]+)['"`]/g;
  let match: RegExpExecArray | null;
  match = varPattern.exec(content);
  while (match !== null) {
    const varName = match[1];
    const varValue = match[2];
    if (varName && varValue && isValidTranslationKey(varValue)) {
      variableMap.set(varName, varValue);
    }
  }
  return variableMap;
}
