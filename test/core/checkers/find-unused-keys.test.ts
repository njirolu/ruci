import { describe, it, expect } from "bun:test";
import { findUnusedKeys } from "../../../src/core/checkers/find-unused-keys";
import type { TranslationFile } from "../../../src/types/translation";

describe("findUnusedKeys", () => {
  it("should find unused keys when other language files have extra keys", () => {
    const baseLangFile: TranslationFile = {
      path: "en.json",
      data: {
        common: {
          hello: "Hello",
        },
      },
    };

    const otherLangFiles: TranslationFile[] = [
      {
        path: "es.json",
        data: {
          common: {
            hello: "Hola",
            goodbye: "Adiós",
          },
          errors: {
            notFound: "No encontrado",
          },
        },
      },
      {
        path: "fr.json",
        data: {
          common: {
            hello: "Bonjour",
            welcome: "Bienvenue",
          },
        },
      },
    ];

    const result = findUnusedKeys(baseLangFile, otherLangFiles);

    expect(result).toHaveLength(2);

    // Check Spanish file results
    const spanishResult = result.find((r) => r.filePath === "es.json");
    expect(spanishResult).toBeDefined();
    expect(spanishResult?.unusedKeys).toHaveLength(2);
    expect(spanishResult?.unusedKeys.map((k) => k.key)).toContain(
      "common.goodbye",
    );
    expect(spanishResult?.unusedKeys.map((k) => k.key)).toContain(
      "errors.notFound",
    );

    // Check French file results
    const frenchResult = result.find((r) => r.filePath === "fr.json");
    expect(frenchResult).toBeDefined();
    expect(frenchResult?.unusedKeys).toHaveLength(1);
    expect(frenchResult?.unusedKeys.map((k) => k.key)).toContain(
      "common.welcome",
    );
  });

  it("should return empty array when no unused keys exist", () => {
    const baseLangFile: TranslationFile = {
      path: "en.json",
      data: {
        hello: "Hello",
        goodbye: "Goodbye",
      },
    };

    const otherLangFiles: TranslationFile[] = [
      {
        path: "es.json",
        data: {
          hello: "Hola",
          goodbye: "Adiós",
        },
      },
    ];

    const result = findUnusedKeys(baseLangFile, otherLangFiles);

    expect(result).toHaveLength(0);
  });

  it("should handle when other files have subset of base keys", () => {
    const baseLangFile: TranslationFile = {
      path: "en.json",
      data: {
        hello: "Hello",
        goodbye: "Goodbye",
        welcome: "Welcome",
      },
    };

    const otherLangFiles: TranslationFile[] = [
      {
        path: "es.json",
        data: {
          hello: "Hola",
        },
      },
    ];

    const result = findUnusedKeys(baseLangFile, otherLangFiles);

    expect(result).toHaveLength(0);
  });

  it("should handle empty base language file", () => {
    const baseLangFile: TranslationFile = {
      path: "en.json",
      data: {},
    };

    const otherLangFiles: TranslationFile[] = [
      {
        path: "es.json",
        data: {
          hello: "Hola",
        },
      },
    ];

    const result = findUnusedKeys(baseLangFile, otherLangFiles);

    expect(result).toHaveLength(1);
    expect(result[0]?.filePath).toBe("es.json");
    expect(result[0]?.unusedKeys).toHaveLength(1);
    expect(result[0]?.unusedKeys[0]?.key).toBe("hello");
    expect(result[0]?.unusedKeys[0]?.value).toBe("N/A");
  });

  it("should handle empty other language files", () => {
    const baseLangFile: TranslationFile = {
      path: "en.json",
      data: {
        hello: "Hello",
      },
    };

    const otherLangFiles: TranslationFile[] = [
      {
        path: "es.json",
        data: {},
      },
    ];

    const result = findUnusedKeys(baseLangFile, otherLangFiles);

    expect(result).toHaveLength(0);
  });

  it("should handle nested objects correctly", () => {
    const baseLangFile: TranslationFile = {
      path: "en.json",
      data: {
        level1: {
          level2: {
            key: "value",
          },
        },
      },
    };

    const otherLangFiles: TranslationFile[] = [
      {
        path: "es.json",
        data: {
          level1: {
            level2: {
              key: "valor",
              extraKey: "valor extra",
            },
            extraLevel: {
              deepExtra: "deep extra",
            },
          },
        },
      },
    ];

    const result = findUnusedKeys(baseLangFile, otherLangFiles);

    expect(result).toHaveLength(1);
    expect(result[0]?.unusedKeys).toHaveLength(2);
    expect(result[0]?.unusedKeys.map((k) => k.key)).toContain(
      "level1.level2.extraKey",
    );
    expect(result[0]?.unusedKeys.map((k) => k.key)).toContain(
      "level1.extraLevel.deepExtra",
    );
  });

  it("should handle empty arrays", () => {
    const baseLangFile: TranslationFile = {
      path: "en.json",
      data: {
        hello: "Hello",
      },
    };

    const result = findUnusedKeys(baseLangFile, []);

    expect(result).toHaveLength(0);
  });

  it("should handle multiple files with mixed scenarios", () => {
    const baseLangFile: TranslationFile = {
      path: "en.json",
      data: {
        shared: "Shared",
        base: "Base only",
      },
    };

    const otherLangFiles: TranslationFile[] = [
      {
        path: "es.json",
        data: {
          shared: "Compartido",
          spanish: "Solo español",
        },
      },
      {
        path: "fr.json",
        data: {
          shared: "Partagé",
        },
      },
    ];

    const result = findUnusedKeys(baseLangFile, otherLangFiles);

    expect(result).toHaveLength(1);
    expect(result[0]?.filePath).toBe("es.json");
    expect(result[0]?.unusedKeys).toHaveLength(1);
    expect(result[0]?.unusedKeys[0]?.key).toBe("spanish");
  });
});
