import { describe, it, expect } from "bun:test";
import { findMissingKeys } from "../../../src/core/checkers/find-missing-keys";
import type { TranslationFile } from "../../../src/types/translation";

describe("findMissingKeys", () => {
  it("should find missing keys when other language files are missing keys from base", () => {
    const baseLangFile: TranslationFile = {
      path: "en.json",
      data: {
        common: {
          hello: "Hello",
          goodbye: "Goodbye",
        },
        errors: {
          notFound: "Not found",
          serverError: "Server error",
        },
      },
    };

    const otherLangFiles: TranslationFile[] = [
      {
        path: "es.json",
        data: {
          common: {
            hello: "Hola",
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
            goodbye: "Au revoir",
          },
        },
      },
    ];

    const result = findMissingKeys(baseLangFile, otherLangFiles);

    expect(result).toHaveLength(2);

    // Check Spanish file results
    const spanishResult = result.find((r) => r.filePath === "es.json");
    expect(spanishResult).toBeDefined();
    expect(spanishResult?.missingKeys).toHaveLength(2);
    expect(spanishResult?.missingKeys.map((k) => k.key)).toContain(
      "common.goodbye",
    );
    expect(spanishResult?.missingKeys.map((k) => k.key)).toContain(
      "errors.serverError",
    );

    // Check French file results
    const frenchResult = result.find((r) => r.filePath === "fr.json");
    expect(frenchResult).toBeDefined();
    expect(frenchResult?.missingKeys).toHaveLength(2);
    expect(frenchResult?.missingKeys.map((k) => k.key)).toContain(
      "errors.notFound",
    );
    expect(frenchResult?.missingKeys.map((k) => k.key)).toContain(
      "errors.serverError",
    );
  });

  it("should return empty array when all keys are present", () => {
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

    const result = findMissingKeys(baseLangFile, otherLangFiles);

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

    const result = findMissingKeys(baseLangFile, otherLangFiles);

    expect(result).toHaveLength(0);
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

    const result = findMissingKeys(baseLangFile, otherLangFiles);

    expect(result).toHaveLength(1);
    expect(result[0]?.filePath).toBe("es.json");
    expect(result[0]?.missingKeys).toHaveLength(1);
    expect(result[0]?.missingKeys[0]?.key).toBe("hello");
    expect(result[0]?.missingKeys[0]?.value).toBe("N/A");
  });

  it("should handle nested objects correctly", () => {
    const baseLangFile: TranslationFile = {
      path: "en.json",
      data: {
        level1: {
          level2: {
            level3: {
              deepKey: "Deep value",
            },
          },
        },
      },
    };

    const otherLangFiles: TranslationFile[] = [
      {
        path: "es.json",
        data: {
          level1: {
            level2: {},
          },
        },
      },
    ];

    const result = findMissingKeys(baseLangFile, otherLangFiles);

    expect(result).toHaveLength(1);
    expect(result[0]?.missingKeys).toHaveLength(1);
    expect(result[0]?.missingKeys[0]?.key).toBe("level1.level2.level3.deepKey");
  });

  it("should handle empty arrays", () => {
    const baseLangFile: TranslationFile = {
      path: "en.json",
      data: {
        hello: "Hello",
      },
    };

    const result = findMissingKeys(baseLangFile, []);

    expect(result).toHaveLength(0);
  });
});
