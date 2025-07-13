import { test, expect, describe, mock, afterEach, spyOn } from "bun:test";
import * as fs from "node:fs/promises";

import { loadConfig } from "../../src/config/loader";
import { FileSystemError } from "../../src/core/errors";

describe("loadConfig", () => {
  afterEach(() => {
    mock.restore();
  });

  test("should return a valid config object with default values", async () => {
    spyOn(fs, "readFile").mockRejectedValue({ code: "ENOENT" });

    const config = await loadConfig();

    expect(config).toBeDefined();
    expect(config.baseLanguagePath).toBe("src/assets/i18n/en.json");
    expect(config.languagePaths).toEqual([
      "src/assets/i18n/es.json",
      "src/assets/i18n/fr.json",
    ]);
    expect(config.projectFiles).toEqual(["src/**/*.ts", "src/**/*.html"]);
    expect(config.options).toBeDefined();
    expect(config.options.missingKeys).toBe("skip");
    expect(config.options.unusedKeys).toBe("skip");
    expect(config.options.duplicateValues).toBe("skip");
    expect(config.options.verifyProjectKeys).toBe("skip");
    expect(config.baseDir).toBe(process.cwd());
  });

  test("should merge CLI arguments with config", async () => {
    spyOn(fs, "readFile").mockRejectedValue({ code: "ENOENT" });

    const cliArgs = {
      baseLanguagePath: "overridden/path/en.json",
    };

    const config = await loadConfig(cliArgs);

    expect(config.baseLanguagePath).toBe(cliArgs.baseLanguagePath);
    expect(config.baseDir).toBeDefined();
  });

  test("should load and parse config file when it exists", async () => {
    const configContent = JSON.stringify({
      baseLanguagePath: "src/i18n/en.json",
      languagePaths: ["src/i18n/es.json"],
      projectFiles: ["src/**/*.ts"],
      options: {
        missingKeys: "error",
        unusedKeys: "warn",
      },
    });

    spyOn(fs, "readFile").mockResolvedValue(configContent);

    const config = await loadConfig();

    expect(config.baseLanguagePath).toBe("src/i18n/en.json");
    expect(config.languagePaths).toEqual(["src/i18n/es.json"]);
    expect(config.projectFiles).toEqual(["src/**/*.ts"]);
    expect(config.options.missingKeys).toBe("error");
    expect(config.options.unusedKeys).toBe("warn");
  });

  test("should throw FileSystemError for file read errors other than ENOENT", async () => {
    const readError = new Error("Permission denied");
    (readError as NodeJS.ErrnoException).code = "EACCES";
    spyOn(fs, "readFile").mockRejectedValue(readError);

    await expect(loadConfig()).rejects.toThrow(FileSystemError);
  });

  test("should merge file config with CLI args correctly", async () => {
    const configContent = JSON.stringify({
      baseLanguagePath: "file/en.json",
      languagePaths: ["file/es.json"],
      options: {
        missingKeys: "warn",
      },
    });

    spyOn(fs, "readFile").mockResolvedValue(configContent);

    const cliArgs = {
      baseLanguagePath: "cli/en.json",
      projectFiles: ["cli/**/*.ts"],
    };

    const config = await loadConfig(cliArgs);

    // CLI args should override file config
    expect(config.baseLanguagePath).toBe("cli/en.json");
    expect(config.projectFiles).toEqual(["cli/**/*.ts"]);
    // File config should be preserved where not overridden
    expect(config.languagePaths).toEqual(["file/es.json"]);
    expect(config.options.missingKeys).toBe("warn");
  });

  test("should return config with proper structure", async () => {
    spyOn(fs, "readFile").mockRejectedValue({ code: "ENOENT" });

    const config = await loadConfig();

    expect(config).toHaveProperty("baseLanguagePath");
    expect(config).toHaveProperty("languagePaths");
    expect(config).toHaveProperty("projectFiles");
    expect(config).toHaveProperty("options");
    expect(config).toHaveProperty("baseDir");
    expect(config.options).toHaveProperty("missingKeys");
    expect(config.options).toHaveProperty("unusedKeys");
    expect(config.options).toHaveProperty("duplicateValues");
    expect(config.options).toHaveProperty("verifyProjectKeys");
  });
});
