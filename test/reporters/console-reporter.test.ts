import { test, expect, mock, beforeEach, afterEach, spyOn } from "bun:test";
import {
  reportMissingKeys,
  reportUnusedKeys,
  reportDuplicateValues,
  reportVerifyProjectKeys,
} from "../../src/reporters/console-reporter";
import type {
  DuplicateValuesResult,
  MissingKeysResult,
  UnusedKeysResult,
  VerifyProjectKeysResult,
} from "../../src/types/translation";

mock.module("chalk", () => {
  const self = (str: string) => str;
  const chalkMock = new Proxy(self, {
    get: () => chalkMock,
  });
  return { default: chalkMock };
});

let consoleSpy: ReturnType<typeof spyOn<typeof console, "log">>;
let logMessages: string[] = [];

beforeEach(() => {
  logMessages = [];
  consoleSpy = spyOn(console, "log").mockImplementation((msg = "") => {
    logMessages.push(msg);
  });
});

afterEach(() => {
  consoleSpy.mockRestore();
});

test("reportMissingKeys: should not log anything for empty results", () => {
  reportMissingKeys([]);
  expect(consoleSpy).not.toHaveBeenCalled();
});

test("reportMissingKeys: should log a report for missing keys", () => {
  const results: MissingKeysResult[] = [
    {
      filePath: "en/common.json",

      missingKeys: [
        { key: "header.title", value: "Welcome" },
        { key: "footer.copyright", value: "© 2025" },
      ],
    },
  ];

  reportMissingKeys(results);

  const output = logMessages.join("\n");
  expect(output).toContain("🚨 Missing Keys Report");
  expect(output).toContain("📄 File: en/common.json");
  expect(output).toContain("- header.title");
  expect(output).toContain("- footer.copyright");
});

test("reportUnusedKeys: should not log anything for empty results", () => {
  reportUnusedKeys([]);
  expect(consoleSpy).not.toHaveBeenCalled();
});

test("reportUnusedKeys: should log a report for unused keys", () => {
  const results: UnusedKeysResult[] = [
    {
      filePath: "src/app.component.ts",

      unusedKeys: [{ key: "old.feature.flag", value: true }],
    },
  ];

  reportUnusedKeys(results);

  const output = logMessages.join("\n");
  expect(output).toContain("⚠️ Unused Keys Report");
  expect(output).toContain("📄 In file: src/app.component.ts");
  expect(output).toContain("- old.feature.flag");
});

test("reportDuplicateValues: should not log anything for empty results", () => {
  reportDuplicateValues([]);
  expect(consoleSpy).not.toHaveBeenCalled();
});

test("reportDuplicateValues: should log a full report for duplicate values", () => {
  const results: DuplicateValuesResult[] = [
    {
      filePath: "en/common.json",
      totalKeys: 10,
      duplicates: [
        {
          value: "Click here",
          keys: ["button.submit", "link.action"],
        },
      ],
    },
  ];

  reportDuplicateValues(results);

  const output = logMessages.join("\n");

  expect(output).toContain("⚠️ Duplicate Values Found");
  expect(output).toContain("📄 In file: common.json");
  expect(output).toContain('- Value: "Click here"');
  expect(output).toContain('Keys: ["button.submit", "link.action"]');

  expect(output).toContain("✨ Summary:");
  expect(output).toContain("Current Total Keys:  10");
  expect(output).toContain("Expected Total Keys: 9"); // 10 - (2 - 1)
  expect(output).toContain("🔑 Duplicate Keys:   2");
  expect(output).toContain("🗣️  Duplicate Values: 1");
});

test("reportVerifyProjectKeys: should not log anything if there are no differences", () => {
  const result: VerifyProjectKeysResult = {
    missingInProject: [],
    unusedInBaseLanguage: [],
  };
  reportVerifyProjectKeys(result);
  expect(consoleSpy).not.toHaveBeenCalled();
});

test("reportVerifyProjectKeys: should report only missing keys", () => {
  const result: VerifyProjectKeysResult = {
    missingInProject: [
      {
        key: "new.key.in.base",
        filePath: "",
        lineNumber: 0,
        fileType: "typescript",
      },
    ],
    unusedInBaseLanguage: [],
  };
  reportVerifyProjectKeys(result);

  const output = logMessages.join("\n");
  expect(output).toContain("⚠️  Missing in Project (From Base Language)");
  expect(output).toContain("- new.key.in.base");
  expect(output).not.toContain("🆘  Used in Project, Missing in Base Language");
});

test("reportVerifyProjectKeys: should report only unused keys", () => {
  const result: VerifyProjectKeysResult = {
    missingInProject: [],
    unusedInBaseLanguage: [
      {
        key: "extra.key",
        filePath: "src/app.ts",
        lineNumber: 42,
        fileType: "typescript",
      },
    ],
  };
  reportVerifyProjectKeys(result);

  const output = logMessages.join("\n");
  expect(output).toContain("🆘  Used in Project, Missing in Base Language");
  expect(output).toContain("- extra.key   [src/app.ts:42]");
  expect(output).not.toContain("⚠️  Missing in Project (From Base Language)");
});
