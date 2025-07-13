import { describe, it, expect } from "bun:test";
import { findDuplicateValues } from "../../../src/core/checkers/find-duplicate-values";
import type { TranslationFile } from "../../../src/types/translation";

describe("findDuplicateValues", () => {
  it("should find duplicate values in translation files", () => {
    const translationFiles: TranslationFile[] = [
      {
        path: "en.json",
        data: {
          common: {
            hello: "Hello",
            greeting: "Hello",
            goodbye: "Goodbye",
          },
          errors: {
            notFound: "Not found",
            missing: "Not found",
          },
        },
      },
      {
        path: "es.json",
        data: {
          common: {
            hello: "Hola",
            greeting: "Hola",
            welcome: "Bienvenido",
          },
        },
      },
    ];

    const result = findDuplicateValues(translationFiles);

    expect(result).toHaveLength(2);

    const englishResult = result.find((r) => r.filePath === "en.json");
    expect(englishResult).toBeDefined();
    expect(englishResult?.duplicates).toHaveLength(2);
    expect(englishResult?.totalKeys).toBe(5);

    const helloDuplicate = englishResult?.duplicates.find(
      (d) => d.value === "Hello",
    );
    expect(helloDuplicate).toBeDefined();
    expect(helloDuplicate?.keys).toHaveLength(2);
    expect(helloDuplicate?.keys).toContain("common.hello");
    expect(helloDuplicate?.keys).toContain("common.greeting");

    const notFoundDuplicate = englishResult?.duplicates.find(
      (d) => d.value === "Not found",
    );
    expect(notFoundDuplicate).toBeDefined();
    expect(notFoundDuplicate?.keys).toHaveLength(2);
    expect(notFoundDuplicate?.keys).toContain("errors.notFound");
    expect(notFoundDuplicate?.keys).toContain("errors.missing");

    const spanishResult = result.find((r) => r.filePath === "es.json");
    expect(spanishResult).toBeDefined();
    expect(spanishResult?.duplicates).toHaveLength(1);
    expect(spanishResult?.totalKeys).toBe(3);

    const holaDuplicate = spanishResult?.duplicates.find(
      (d) => d.value === "Hola",
    );
    expect(holaDuplicate).toBeDefined();
    expect(holaDuplicate?.keys).toHaveLength(2);
    expect(holaDuplicate?.keys).toContain("common.hello");
    expect(holaDuplicate?.keys).toContain("common.greeting");
  });

  it("should return empty array when no duplicates exist", () => {
    const translationFiles: TranslationFile[] = [
      {
        path: "en.json",
        data: {
          hello: "Hello",
          goodbye: "Goodbye",
          welcome: "Welcome",
        },
      },
    ];

    const result = findDuplicateValues(translationFiles);

    expect(result).toHaveLength(0);
  });

  it("should handle empty translation files", () => {
    const translationFiles: TranslationFile[] = [
      {
        path: "empty.json",
        data: {},
      },
    ];

    const result = findDuplicateValues(translationFiles);

    expect(result).toHaveLength(0);
  });

  it("should handle single key files", () => {
    const translationFiles: TranslationFile[] = [
      {
        path: "single.json",
        data: {
          hello: "Hello",
        },
      },
    ];

    const result = findDuplicateValues(translationFiles);

    expect(result).toHaveLength(0);
  });

  it("should handle nested objects with duplicates", () => {
    const translationFiles: TranslationFile[] = [
      {
        path: "nested.json",
        data: {
          level1: {
            level2: {
              key1: "Duplicate Value",
              key2: "Unique Value",
            },
            level2b: {
              key3: "Duplicate Value",
            },
          },
          level1b: {
            key4: "Another Duplicate",
            key5: "Another Duplicate",
          },
        },
      },
    ];

    const result = findDuplicateValues(translationFiles);

    expect(result).toHaveLength(1);
    expect(result[0]?.duplicates).toHaveLength(2);
    expect(result[0]?.totalKeys).toBe(5);

    const firstDuplicate = result[0]?.duplicates.find(
      (d) => d.value === "Duplicate Value",
    );
    expect(firstDuplicate).toBeDefined();
    expect(firstDuplicate?.keys).toHaveLength(2);
    expect(firstDuplicate?.keys).toContain("level1.level2.key1");
    expect(firstDuplicate?.keys).toContain("level1.level2b.key3");

    const secondDuplicate = result[0]?.duplicates.find(
      (d) => d.value === "Another Duplicate",
    );
    expect(secondDuplicate).toBeDefined();
    expect(secondDuplicate?.keys).toHaveLength(2);
    expect(secondDuplicate?.keys).toContain("level1b.key4");
    expect(secondDuplicate?.keys).toContain("level1b.key5");
  });

  it("should handle multiple duplicates of the same value", () => {
    const translationFiles: TranslationFile[] = [
      {
        path: "multiple.json",
        data: {
          key1: "Same Value",
          key2: "Same Value",
          key3: "Same Value",
          key4: "Different Value",
        },
      },
    ];

    const result = findDuplicateValues(translationFiles);

    expect(result).toHaveLength(1);
    expect(result[0]?.duplicates).toHaveLength(1);
    expect(result[0]?.duplicates[0]?.value).toBe("Same Value");
    expect(result[0]?.duplicates[0]?.keys).toHaveLength(3);
    expect(result[0]?.duplicates[0]?.keys).toContain("key1");
    expect(result[0]?.duplicates[0]?.keys).toContain("key2");
    expect(result[0]?.duplicates[0]?.keys).toContain("key3");
  });

  it("should handle empty array input", () => {
    const result = findDuplicateValues([]);
    expect(result).toHaveLength(0);
  });

  it("should handle mixed data types as strings", () => {
    const translationFiles: TranslationFile[] = [
      {
        path: "mixed.json",
        data: {
          stringKey: "Hello",
          numberKey: 123,
          booleanKey: true,
          nullKey: null,
          duplicateString: "Hello",
        },
      },
    ];

    const result = findDuplicateValues(translationFiles);

    expect(result).toHaveLength(1);
    expect(result[0]?.duplicates).toHaveLength(1);
    expect(result[0]?.duplicates[0]?.value).toBe("Hello");
    expect(result[0]?.duplicates[0]?.keys).toHaveLength(2);
    expect(result[0]?.duplicates[0]?.keys).toContain("stringKey");
    expect(result[0]?.duplicates[0]?.keys).toContain("duplicateString");
  });

  it("should process multiple files independently", () => {
    const translationFiles: TranslationFile[] = [
      {
        path: "file1.json",
        data: {
          key1: "Duplicate in file 1",
          key2: "Duplicate in file 1",
        },
      },
      {
        path: "file2.json",
        data: {
          key3: "Unique in file 2",
          key4: "Another unique",
        },
      },
      {
        path: "file3.json",
        data: {
          key5: "Duplicate in file 3",
          key6: "Duplicate in file 3",
          key7: "Unique in file 3",
        },
      },
    ];

    const result = findDuplicateValues(translationFiles);

    expect(result).toHaveLength(2);

    const file1Result = result.find((r) => r.filePath === "file1.json");
    expect(file1Result).toBeDefined();
    expect(file1Result?.duplicates).toHaveLength(1);

    const file3Result = result.find((r) => r.filePath === "file3.json");
    expect(file3Result).toBeDefined();
    expect(file3Result?.duplicates).toHaveLength(1);

    const file2Result = result.find((r) => r.filePath === "file2.json");
    expect(file2Result).toBeUndefined();
  });
});
