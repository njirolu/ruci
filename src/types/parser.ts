/**
 * A map holding variable names as keys and their resolved string literal values.
 * Used to resolve variables to static strings for key extraction.
 * Example: `Map { 'pageTitle' => 'PAGES.HOME.TITLE' }`
 */
export type VariableValueMap = Map<string, string>;
