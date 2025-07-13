// test/cli/index.test.ts

import { beforeEach, describe, expect, it, mock } from "bun:test";
import { program } from "commander";
import { setupOptions, type CliOptions } from "../../src/cli/options";

// Mock the commander program
// Specify that mockOption is a mock of a function that takes two strings and returns 'program'
const mockOption = mock<(arg1: string, arg2: string) => typeof program>(
  () => program,
); // Chainable

mock.module("commander", () => ({
  program: {
    option: mockOption,
  },
}));

describe("CLI Options Setup", () => {
  beforeEach(() => {
    mock.restore();
  });

  it("should set up all expected CLI options", () => {
    setupOptions();

    expect(mockOption).toHaveBeenCalledTimes(7);

    // Verify each option call
    expect(mockOption).toHaveBeenCalledWith(
      "--base-language-path <path>",
      "Path to the base language file",
    );
    expect(mockOption).toHaveBeenCalledWith(
      "--language-paths <paths...>",
      "Paths to other language files",
    );
    expect(mockOption).toHaveBeenCalledWith(
      "--project-files <files...>",
      "Paths to project files",
    );
    expect(mockOption).toHaveBeenCalledWith(
      "--missing-keys <level>",
      "Find missing keys in translation files (warn|error|skip)",
    );
    expect(mockOption).toHaveBeenCalledWith(
      "--unused-keys <level>",
      "Find unused keys in translation files (warn|error|skip)",
    );
    expect(mockOption).toHaveBeenCalledWith(
      "--duplicate-values <level>",
      "Find duplicate values in translation files (warn|error|skip)",
    );
    expect(mockOption).toHaveBeenCalledWith(
      "--verify-project-keys <level>",
      "Verify translation keys used in project files (warn|error|skip)",
    );
  });

  it("should setup options in the correct order", () => {
    setupOptions();

    // Now TypeScript knows that 'calls' will contain arrays of [string, string]
    const calls = mockOption.mock.calls;

    expect(calls[0]).toEqual([
      "--base-language-path <path>",
      "Path to the base language file",
    ]);

    expect(calls[1]).toEqual([
      "--language-paths <paths...>",
      "Paths to other language files",
    ]);

    expect(calls[2]).toEqual([
      "--project-files <files...>",
      "Paths to project files",
    ]);

    expect(calls[3]).toEqual([
      "--missing-keys <level>",
      "Find missing keys in translation files (warn|error|skip)",
    ]);

    expect(calls[4]).toEqual([
      "--unused-keys <level>",
      "Find unused keys in translation files (warn|error|skip)",
    ]);

    expect(calls[5]).toEqual([
      "--duplicate-values <level>",
      "Find duplicate values in translation files (warn|error|skip)",
    ]);

    expect(calls[6]).toEqual([
      "--verify-project-keys <level>",
      "Verify translation keys used in project files (warn|error|skip)",
    ]);
  });

  it("should return chainable program instance", () => {
    setupOptions();

    // Each option call should return the program for chaining
    expect(
      mockOption.mock.results.every((result) => result.value === program),
    ).toBe(true);
  });
});

describe("CliOptions interface", () => {
  it("should have correct optional properties", () => {
    const validOptions: CliOptions = {
      baseLanguagePath: "/path/to/base.json",
      languagePaths: ["/path/to/es.json", "/path/to/fr.json"],
      projectFiles: ["/path/to/src/**/*.ts"],
      missingKeys: "warn",
      unusedKeys: "error",
      duplicateValues: "skip",
      verifyProjectKeys: "warn",
    };

    expect(validOptions.baseLanguagePath).toBe("/path/to/base.json");
    expect(validOptions.languagePaths).toEqual([
      "/path/to/es.json",
      "/path/to/fr.json",
    ]);
    expect(validOptions.projectFiles).toEqual(["/path/to/src/**/*.ts"]);
    expect(validOptions.missingKeys).toBe("warn");
    expect(validOptions.unusedKeys).toBe("error");
    expect(validOptions.duplicateValues).toBe("skip");
    expect(validOptions.verifyProjectKeys).toBe("warn");
  });

  it("should allow empty options object", () => {
    const emptyOptions: CliOptions = {};
    expect(emptyOptions).toEqual({});
  });

  it("should allow partial options", () => {
    const partialOptions: CliOptions = {
      baseLanguagePath: "/path/to/base.json",
      missingKeys: "error",
    };

    expect(partialOptions.baseLanguagePath).toBe("/path/to/base.json");
    expect(partialOptions.missingKeys).toBe("error");
    expect(partialOptions.languagePaths).toBeUndefined();
    expect(partialOptions.projectFiles).toBeUndefined();
  });

  it("should enforce correct level values for check options", () => {
    const validLevels: Array<"warn" | "error" | "skip"> = [
      "warn",
      "error",
      "skip",
    ];

    for (const level of validLevels) {
      const options: CliOptions = {
        missingKeys: level,
        unusedKeys: level,
        duplicateValues: level,
        verifyProjectKeys: level,
      };

      expect(options.missingKeys).toBe(level);
      expect(options.unusedKeys).toBe(level);
      expect(options.duplicateValues).toBe(level);
      expect(options.verifyProjectKeys).toBe(level);
    }
  });

  it("should handle array properties correctly", () => {
    const optionsWithArrays: CliOptions = {
      languagePaths: [],
      projectFiles: [],
    };

    expect(Array.isArray(optionsWithArrays.languagePaths)).toBe(true);
    expect(Array.isArray(optionsWithArrays.projectFiles)).toBe(true);
    expect(optionsWithArrays.languagePaths).toHaveLength(0);
    expect(optionsWithArrays.projectFiles).toHaveLength(0);
  });
});
