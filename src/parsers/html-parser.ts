import {
  getComponentVariableMapForHtmlFile,
  isValidTranslationKey,
} from "@/core/services/key-extractor";
import type { TranslationUsage } from "@/types/translation";

/**
 * Extracts translation keys from HTML content using the Angular template compiler.
 * Falls back to a regex-based approach if AST parsing fails.
 *
 * @param htmlContent - The string content of the HTML file.
 * @param filePath - The path of the HTML file, used for context and error logging.
 * @returns A promise resolving to an array of found translation usages.
 */
export async function extractKeysFromHtmlContent(
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

    if (parsedTemplate.errors && parsedTemplate.errors.length > 0) {
      // Log warnings but attempt to proceed if there are recoverable errors.
      console.warn(
        `⚠️ Angular template parser reported errors for ${filePath}:`,
        parsedTemplate.errors,
      );
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
  variableMap: Map<string, string>,
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
  variableMap: Map<string, string>,
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
    match = translatePipePattern.exec(line);
    while (match !== null) {
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
