import * as fs from "node:fs/promises";

import * as ts from "typescript";

import type { TranslationUsage } from "@/types/translation";
import type { VariableValueMap } from "@/types/parser";

/**
 * Validates if a string is a plausible, static translation key.
 * Excludes empty strings and strings containing template placeholders.
 *
 * @param key - The string to validate.
 * @returns `true` if the key is valid, otherwise `false`.
 */
export function isValidTranslationKey(key: string): boolean {
  return (
    Boolean(key) &&
    key.length > 0 &&
    !key.includes("{{") &&
    !key.includes("}}") &&
    !key.includes("${") &&
    !key.includes("\n")
  );
}

/**
 * Parses a TypeScript file and builds a map of variable/property names to their static string values.
 * This is essential for resolving indirect translation key usages.
 *
 * @param sourceFile - The TypeScript AST for a file.
 * @returns A `VariableValueMap`.
 */
export function mapVariablesFromTypeScriptAST(
  sourceFile: ts.SourceFile,
): VariableValueMap {
  const variableMap: VariableValueMap = new Map();

  function visitNode(node: ts.Node): void {
    let variableName: string | undefined;
    let stringValue: string | undefined;

    // `const myVar = 'value'` or `let myVar = 'value'`
    if (
      ts.isVariableDeclaration(node) &&
      node.initializer &&
      ts.isStringLiteral(node.initializer)
    ) {
      variableName = node.name.getText(sourceFile);
      stringValue = node.initializer.text;
    }
    // `classProperty = 'value'`
    else if (
      ts.isPropertyDeclaration(node) &&
      node.initializer &&
      ts.isStringLiteral(node.initializer)
    ) {
      variableName = node.name.getText(sourceFile);
      stringValue = node.initializer.text;
    }

    if (variableName && stringValue && isValidTranslationKey(stringValue)) {
      variableMap.set(variableName, stringValue);
    }

    ts.forEachChild(node, visitNode);
  }

  visitNode(sourceFile);
  return variableMap;
}

/**
 * Finds the corresponding `.component.ts` file for a `.component.html` file,
 * reads it, and returns its variable map. Returns an empty map if not found.
 * This operation is memoized for performance to avoid re-reading and re-parsing the same file.
 */
export const getComponentVariableMapForHtmlFile = (() => {
  const cache: Map<string, Promise<VariableValueMap>> = new Map();

  const fn = (htmlFilePath: string): Promise<VariableValueMap> => {
    const componentFilePath = htmlFilePath.replace(
      /\.component\.html$/,
      ".component.ts",
    );

    if (cache.has(componentFilePath)) {
      return cache.get(componentFilePath)!;
    }

    const promise = (async (): Promise<VariableValueMap> => {
      try {
        const componentContent = await fs.readFile(componentFilePath, "utf-8");
        try {
          // Try AST-based parsing first
          const sourceFile = ts.createSourceFile(
            componentFilePath,
            componentContent,
            ts.ScriptTarget.Latest,
            true,
          );
          // Check for parsing errors, which can happen with malformed files
          if ((sourceFile as any).parseDiagnostics?.length > 0) {
            throw new Error("TypeScript AST parsing failed with diagnostics.");
          }
          const variableMap = mapVariablesFromTypeScriptAST(sourceFile);
          return variableMap;
        } catch (_astError) {
          // Fallback to regex if AST parsing fails
          console.warn(
            `[WARN] AST parsing failed for ${componentFilePath}, falling back to regex.`,
          );
          return mapVariablesWithRegex(componentContent);
        }
      } catch (fileError) {
        // This outer catch handles file read errors (e.g., file not found)
        if ((fileError as NodeJS.ErrnoException).code !== "ENOENT") {
          console.warn(
            `[WARN] Failed to read component file: ${componentFilePath}. Error: ${
              (fileError as Error).message
            }`,
          );
        }
        return new Map<string, string>();
      }
    })();

    cache.set(componentFilePath, promise);
    return promise;
  };

  // Add cache clearing function for testing
  fn.clearCache = () => {
    cache.clear();
  };

  return fn;
})();

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
    /(?:const|let|var|public|private|protected)?\s*([a-zA-Z_$][\w$]*)\s*=\s*['"`]([^'"`]+)['"`]/g;
  let match: RegExpExecArray | null;
  // biome-ignore lint/suspicious/noAssignInExpressions: The code block hangs during unit tests, preventing further test execution.
  while ((match = varPattern.exec(content)) !== null) {
    const varName = match[1];
    const varValue = match[2];
    if (varName && varValue && isValidTranslationKey(varValue)) {
      variableMap.set(varName, varValue);
    }
  }
  return variableMap;
}

/**
 * Recursively traverses the Angular template AST to find translation keys.
 *
 * @param node - The current AST node to inspect.
 * @param filePath - The file path for context.
 * @param variableMap - The map of variables from the component class.
 * @param usages - The array to push found usages into.
 */
function traverseAngularAst(
  node: any,
  filePath: string,
  variableMap: VariableValueMap,
  usages: TranslationUsage[],
): void {
  if (!node) return;

  const currentLineNumber = node.sourceSpan?.start?.line ?? 0;

  // Check various parts of the AST node where expressions can exist.
  const expressions = [
    node.value?.ast,
    ...(node.inputs?.map((i: any) => i.value?.ast) ?? []),
    ...(node.outputs?.map((o: any) => o.handler?.ast) ?? []),
    ...(node.templateAttrs?.map((a: any) => a.value?.ast) ?? []),
  ];

  for (const expression of expressions) {
    if (expression) {
      analyzeAngularExpression(
        expression,
        filePath,
        variableMap,
        usages,
        currentLineNumber,
      );
    }
  }

  // Recursively visit all child nodes.
  if (node.children) {
    for (const child of node.children) {
      traverseAngularAst(child, filePath, variableMap, usages);
    }
  }
}

/**
 * Analyzes an Angular expression AST node to find and extract translation keys.
 *
 * @param expression - The expression AST node.
 * @param filePath - The file path for context.
 * @param variableMap - The variable map for resolving identifiers.
 * @param usages - The array to push found usages into.
 * @param lineNumber - The line number of the expression.
 */
function analyzeAngularExpression(
  expression: any,
  filePath: string,
  variableMap: VariableValueMap,
  usages: TranslationUsage[],
  lineNumber: number,
): void {
  if (!expression) return;

  // Primary target: An expression being piped into 'translate'.
  if (
    expression.constructor?.name === "BindingPipe" &&
    expression.name === "translate"
  ) {
    let resolvedKey: string | null = null;
    const keyExpression = expression.exp;

    if (keyExpression?.value && typeof keyExpression.value === "string") {
      // Case 1: A direct string literal, e.g., 'KEY' | translate
      resolvedKey = keyExpression.value;
    } else if (keyExpression?.name && typeof keyExpression.name === "string") {
      // Case 2: A variable, e.g., myVariable | translate
      // Resolve the variable name against the component's variable map.
      resolvedKey = variableMap.get(keyExpression.name) ?? null;
    }

    if (resolvedKey && isValidTranslationKey(resolvedKey)) {
      usages.push({
        key: resolvedKey,
        filePath: filePath,
        lineNumber: lineNumber + 1, // AST lines are 0-based.
        fileType: "html",
      });
    }
  }

  // Recursively analyze nested expressions (e.g., inside arguments or other pipes).
  if (expression.expressions) {
    // biome-ignore lint/suspicious/noExplicitAny: Skip type checking for args since Angular AST is dynamic
    expression.expressions.forEach((expr: any) =>
      analyzeAngularExpression(expr, filePath, variableMap, usages, lineNumber),
    );
  }
  if (expression.exp) {
    analyzeAngularExpression(
      expression.exp,
      filePath,
      variableMap,
      usages,
      lineNumber,
    );
  }
  if (expression.args) {
    // biome-ignore lint/suspicious/noExplicitAny: Skip type checking for args since Angular AST is dynamic
    expression.args.forEach((arg: any) =>
      analyzeAngularExpression(arg, filePath, variableMap, usages, lineNumber),
    );
  }
}

/**
 * Fallback function to extract keys from HTML using regular expressions.
 * Less accurate than AST parsing but robust against syntax errors.
 *
 * @param htmlContent The content of the HTML file.
 * @param filePath The path of the file.
 * @returns An array of found translation usages.
 */
async function extractHtmlKeysWithRegex(
  htmlContent: string,
  filePath: string,
): Promise<TranslationUsage[]> {
  const usages: TranslationUsage[] = [];
  const componentVariableMap =
    await getComponentVariableMapForHtmlFile(filePath);
  const contentLines = htmlContent.split("\n");

  // Regex to find `'key' | translate` or `variable | translate`.
  const translatePipePattern =
    /(?:['"`]([^'"`]+)['"`]|([a-zA-Z_$][\w$]*))\s*\|\s*translate/g;

  contentLines.forEach((line, index) => {
    let match: RegExpExecArray | null;
    // biome-ignore lint/suspicious/noAssignInExpressions: The code block hangs during unit tests, preventing further test execution.
    while ((match = translatePipePattern.exec(line)) !== null) {
      const stringLiteralKey = match[1];
      const variableNameKey = match[2];
      let resolvedKey: string | null = null;

      if (stringLiteralKey) {
        resolvedKey = stringLiteralKey;
      } else if (variableNameKey) {
        resolvedKey = componentVariableMap.get(variableNameKey) ?? null;
      }

      if (resolvedKey && isValidTranslationKey(resolvedKey)) {
        usages.push({
          key: resolvedKey,
          filePath: filePath,
          lineNumber: index + 1,
          fileType: "html",
        });
      }
    }
  });

  return usages;
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
  sourceFile: ts.SourceFile,
  node: ts.Node,
  variableMap: VariableValueMap,
  usages: TranslationUsage[],
  filePath: string,
): void {
  // Target: A method call expression, e.g., `service.method()`.
  if (ts.isCallExpression(node)) {
    analyzeTranslateServiceCall(
      node,
      sourceFile,
      variableMap,
      usages,
      filePath,
    );
  }

  // Target: Property access with an argument, e.g., `translations['key']`.
  if (ts.isElementAccessExpression(node)) {
    analyzeTranslationObjectAccess(node, sourceFile, usages, filePath);
  }

  // Continue traversal to all children of the current node.
  ts.forEachChild(node, (childNode) =>
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
  callNode: ts.CallExpression,
  sourceFile: ts.SourceFile,
  variableMap: VariableValueMap,
  usages: TranslationUsage[],
  filePath: string,
): void {
  if (!ts.isPropertyAccessExpression(callNode.expression)) return;

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
  argNode: ts.Expression,
  variableMap: VariableValueMap,
): string[] {
  // Case 1: `translate.get('KEY')`
  if (ts.isStringLiteral(argNode)) {
    return [argNode.text];
  }

  // Case 2: `translate.get(['KEY1', 'KEY2'])`
  if (ts.isArrayLiteralExpression(argNode)) {
    return argNode.elements
      .filter(ts.isStringLiteral)
      .map((element) => element.text);
  }

  // Case 3: `translate.get(myVariable)` or `translate.get(this.myProperty)`
  let variableName: string | undefined;
  if (ts.isIdentifier(argNode)) {
    variableName = argNode.text;
  } else if (
    ts.isPropertyAccessExpression(argNode) &&
    argNode.expression.kind === ts.SyntaxKind.ThisKeyword
  ) {
    variableName = argNode.name.text;
  }

  if (variableName) {
    const resolvedValue = variableMap.get(variableName);
    return resolvedValue ? [resolvedValue] : [];
  }

  // Case 4: `translate.get(condition ? 'KEY1' : 'KEY2')`
  if (ts.isConditionalExpression(argNode)) {
    const keys: string[] = [];

    // Extract keys from both branches of the conditional
    const whenTrueKeys = getKeysFromTranslateArgument(
      argNode.whenTrue,
      variableMap,
    );
    const whenFalseKeys = getKeysFromTranslateArgument(
      argNode.whenFalse,
      variableMap,
    );

    keys.push(...whenTrueKeys, ...whenFalseKeys);
    return keys;
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
  accessNode: ts.ElementAccessExpression,
  sourceFile: ts.SourceFile,
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

  if (ts.isIdentifier(accessNode.expression)) {
    const objectName = accessNode.expression.text;

    if (commonTranslationObjectNames.includes(objectName.toLowerCase())) {
      const keyNode = accessNode.argumentExpression;

      if (keyNode && ts.isStringLiteral(keyNode)) {
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
    // biome-ignore lint/suspicious/noAssignInExpressions: The code block hangs during unit tests, preventing further test execution.
    while ((match = translateCallPattern.exec(line)) !== null) {
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

export async function extractTranslationUsagesFromFile(
  filePath: string,
  fileType: "html" | "typescript",
): Promise<TranslationUsage[]> {
  try {
    const fileContent = await fs.readFile(filePath, "utf-8");

    if (fileType === "html") {
      return await extractKeysFromHtmlContent(fileContent, filePath);
    } else {
      return extractKeysFromTypeScriptContent(fileContent, filePath);
    }
  } catch (error) {
    console.error(`❌ Error reading or processing file ${filePath}:`, error);
    // Return an empty array on error to avoid breaking the Promise.allSettled chain.
    return [];
  }
}

/**
 * Extracts translation keys from HTML content using the Angular template compiler.
 * Falls back to a regex-based approach if AST parsing fails.
 *
 * @param htmlContent - The string content of the HTML file.
 * @param filePath - The path of the HTML file, used for context and error logging.
 * @returns A promise resolving to an array of found translation usages.
 */
async function extractKeysFromHtmlContent(
  htmlContent: string,
  filePath: string,
): Promise<TranslationUsage[]> {
  try {
    // Dynamically import the Angular compiler to keep initial load light.
    const { parseTemplate } = await import("@angular/compiler");

    const parsedTemplate = parseTemplate(htmlContent, filePath, {
      preserveWhitespaces: false,
      // Other options can be configured here if needed.
    });

    // If the parser returns errors, it indicates a malformed template.
    // In this case, we should fall back to the more robust regex method.
    if (parsedTemplate.errors && parsedTemplate.errors.length > 0) {
      console.warn(
        `🟡 Angular template parser reported errors for ${filePath}. Falling back to regex analysis.`,
        parsedTemplate.errors,
      );
      return extractHtmlKeysWithRegex(htmlContent, filePath);
    }

    // Fetch the variable map from the corresponding component.ts file.
    // This is crucial for resolving variables used in the template.
    const componentVariableMap =
      await getComponentVariableMapForHtmlFile(filePath);
    const usages: TranslationUsage[] = [];

    // Begin traversing the AST from the root nodes.
    for (const node of parsedTemplate.nodes) {
      traverseAngularAst(node, filePath, componentVariableMap, usages);
    }
    return usages;
  } catch (error) {
    console.warn(
      `🟡 Angular compiler failed for ${filePath}. Falling back to regex analysis.`,
      error,
    );
    // Fallback to regex if the AST parser throws a critical error.
    return extractHtmlKeysWithRegex(htmlContent, filePath);
  }
}

/**
 * Extracts translation keys from TypeScript content using the TypeScript compiler API.
 * Falls back to a regex-based approach if AST parsing fails.
 *
 * @param tsContent - The string content of the TypeScript file.
 * @param filePath - The path of the TypeScript file.
 * @returns An array of found translation usages.
 */
function extractKeysFromTypeScriptContent(
  tsContent: string,
  filePath: string,
): TranslationUsage[] {
  try {
    const sourceFile = ts.createSourceFile(
      filePath,
      tsContent,
      ts.ScriptTarget.Latest,
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
