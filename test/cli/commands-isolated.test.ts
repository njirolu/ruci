import { beforeEach, describe, expect, it } from "bun:test";
import { Command } from "commander";
import { setupCommands } from "../../src/cli/commands";
import type { CommandDependencies } from "../../src/cli/dependencies";

function createMockDependencies(): CommandDependencies {
  return {
    fileReader: {
      readTranslationFile: async () => ({
        path: "test.json",
        data: { key1: "value1", key2: "value2" },
      }),
      readTranslationFiles: async () => [
        {
          path: "en.json",
          data: { key1: "value1", key2: "value2" },
        },
        {
          path: "fr.json",
          data: { key1: "valeur1", key2: "valeur2" },
        },
      ],
    },
    configLoader: {
      loadConfig: async () => ({
        baseDir: "/test",
        baseLanguagePath: "en.json",
        languagePaths: ["*.json"],
        projectFiles: ["src/**/*.ts"],
        checks: {
          missingKeys: true,
          unusedKeys: true,
          duplicateValues: true,
          verifyProjectKeys: true,
        },
        options: {
          missingKeys: "error",
          unusedKeys: "error",
          duplicateValues: "error",
          verifyProjectKeys: "error",
        },
      }),
    },
    fileSystem: {
      writeFile: async () => {},
    },
    console: {
      log: () => {},
      error: () => {},
      info: () => {},
    },
    process: {
      exit: () => {},
      cwd: () => "/test",
    },
  };
}

describe("CLI Commands with Dependency Injection", () => {
  let mockDeps: CommandDependencies;
  let consoleLogs: string[];
  let consoleErrors: string[];
  let consoleInfos: string[];
  let exitCode: number | null;
  let writtenFiles: { path: string; content: string }[];

  beforeEach(() => {
    consoleLogs = [];
    consoleErrors = [];
    consoleInfos = [];
    exitCode = null;
    writtenFiles = [];

    mockDeps = createMockDependencies();

    // Override console methods to capture output
    mockDeps.console.log = (message: string) => consoleLogs.push(message);
    mockDeps.console.error = (message: string) => consoleErrors.push(message);
    mockDeps.console.info = (message: string) => consoleInfos.push(message);

    // Override process.exit to capture exit code
    mockDeps.process.exit = (code: number) => {
      exitCode = code;
    };

    // Override writeFile to capture file writes
    mockDeps.fileSystem.writeFile = async (path: string, content: string) => {
      writtenFiles.push({ path, content });
    };
  });

  describe("init command", () => {
    it("should create config file successfully", async () => {
      const freshProgram = new Command();
      const program = setupCommands(false, mockDeps, freshProgram);

      // Simulate running init command
      await program.parseAsync(["node", "test", "init"]);

      expect(writtenFiles).toHaveLength(1);
      expect(writtenFiles[0]?.path).toContain("ruci.config.json");
      expect(
        consoleLogs.some((msg) => msg.includes("Successfully created")),
      ).toBe(true);
    });
  });

  describe("main action with missing keys check", () => {
    it("should report success when no missing keys", async () => {
      // Mock config to enable missing keys check
      mockDeps.configLoader.loadConfig = async () => ({
        baseDir: "/test",
        baseLanguagePath: "en.json",
        languagePaths: ["*.json"],
        projectFiles: [],
        checks: {
          missingKeys: true,
          unusedKeys: false,
          duplicateValues: false,
          verifyProjectKeys: false,
        },
        options: {
          missingKeys: "error",
          unusedKeys: "skip",
          duplicateValues: "skip",
          verifyProjectKeys: "skip",
        },
      });

      const freshProgram = new Command();
      const program = setupCommands(false, mockDeps, freshProgram);

      // Simulate running main action
      await program.parseAsync(["node", "test"]);

      expect(
        consoleInfos.some((msg) =>
          msg.includes(
            "✅ [Missing Keys] Translation Keys Available for All Languages",
          ),
        ),
      ).toBe(true);
      expect(exitCode).toBeNull();
    });

    it("should report error when base language path is missing", async () => {
      // Mock config without base language path
      mockDeps.configLoader.loadConfig = async () => ({
        baseDir: "/test",
        baseLanguagePath: "",
        languagePaths: ["*.json"],
        projectFiles: [],
        checks: {
          missingKeys: true,
          unusedKeys: false,
          duplicateValues: false,
          verifyProjectKeys: false,
        },
        options: {
          missingKeys: "error",
          unusedKeys: "skip",
          duplicateValues: "skip",
          verifyProjectKeys: "skip",
        },
      });

      const freshProgram = new Command();
      const program = setupCommands(false, mockDeps, freshProgram);

      // Simulate running main action
      await program.parseAsync(["node", "test"]);

      expect(consoleErrors).toContain(
        "Error: baseLanguagePath is not defined but is required.",
      );
      expect(exitCode).toBe(1);
    });
  });

  describe("unused keys check", () => {
    it("should report success when no unused keys", async () => {
      // Mock config to enable unused keys check
      mockDeps.configLoader.loadConfig = async () => ({
        baseDir: "/test",
        baseLanguagePath: "en.json",
        languagePaths: ["*.json"],
        projectFiles: ["src/**/*.ts"],
        checks: {
          missingKeys: false,
          unusedKeys: true,
          duplicateValues: false,
          verifyProjectKeys: false,
        },
        options: {
          missingKeys: "skip",
          unusedKeys: "error",
          duplicateValues: "skip",
          verifyProjectKeys: "skip",
        },
      });

      const freshProgram = new Command();
      const program = setupCommands(false, mockDeps, freshProgram);

      // Simulate running main action
      await program.parseAsync(["node", "test"]);

      expect(
        consoleInfos.some((msg) =>
          msg.includes(
            "✅ [Unused Keys] All Translation Keys Are Actively Used.",
          ),
        ),
      ).toBe(true);
      expect(exitCode).toBeNull();
    });
  });

  describe("duplicate values check", () => {
    it("should report success when no duplicate values", async () => {
      // Mock config to enable duplicate values check
      mockDeps.configLoader.loadConfig = async () => ({
        baseDir: "/test",
        baseLanguagePath: "en.json",
        languagePaths: ["*.json"],
        projectFiles: [],
        checks: {
          missingKeys: false,
          unusedKeys: false,
          duplicateValues: true,
          verifyProjectKeys: false,
        },
        options: {
          missingKeys: "skip",
          unusedKeys: "skip",
          duplicateValues: "error",
          verifyProjectKeys: "skip",
        },
      });

      const freshProgram = new Command();
      const program = setupCommands(false, mockDeps, freshProgram);

      // Simulate running main action
      await program.parseAsync(["node", "test"]);

      expect(
        consoleInfos.some((msg) =>
          msg.includes("✅ [Duplicate Values] No Duplicate Values Found"),
        ),
      ).toBe(true);
      expect(exitCode).toBeNull();
    });
  });

  describe("verify project keys check", () => {
    it("should report success when all project keys are valid", async () => {
      // Mock config to enable verify project keys check
      mockDeps.configLoader.loadConfig = async () => ({
        baseDir: "/test",
        baseLanguagePath: "en.json",
        languagePaths: ["*.json"],
        projectFiles: ["src/**/*.ts"],
        checks: {
          missingKeys: false,
          unusedKeys: false,
          duplicateValues: false,
          verifyProjectKeys: true,
        },
        options: {
          missingKeys: "skip",
          unusedKeys: "skip",
          duplicateValues: "skip",
          verifyProjectKeys: "error",
        },
      });

      const freshProgram = new Command();
      const program = setupCommands(false, mockDeps, freshProgram);

      // Simulate running main action
      await program.parseAsync(["node", "test"]);

      expect(
        consoleInfos.some((msg) =>
          msg.includes("✅ [Verify Project Keys] All Project Keys Are Valid"),
        ),
      ).toBe(true);
      expect(exitCode).toBeNull();
    });

    it("should report error when project files are missing", async () => {
      // Mock config without project files
      mockDeps.configLoader.loadConfig = async () => ({
        baseDir: "/test",
        baseLanguagePath: "en.json",
        languagePaths: ["*.json"],
        projectFiles: [],
        checks: {
          missingKeys: false,
          unusedKeys: false,
          duplicateValues: false,
          verifyProjectKeys: true,
        },
        options: {
          missingKeys: "skip",
          unusedKeys: "skip",
          duplicateValues: "skip",
          verifyProjectKeys: "error",
        },
      });

      const freshProgram = new Command();
      const program = setupCommands(false, mockDeps, freshProgram);

      // Simulate running main action
      await program.parseAsync(["node", "test"]);

      expect(consoleErrors).toContain(
        "Error: --project-files is required for verifying project keys.",
      );
    });
  });

  describe("error handling", () => {
    it("should exit with code 1 when exitOnError is true and there are errors", async () => {
      // Mock file reader to simulate missing keys
      mockDeps.fileReader.readTranslationFiles = async () => [
        {
          path: "en.json",
          data: { key1: "value1", key2: "value2" },
        },
        {
          path: "fr.json",
          data: { key1: "valeur1" }, // Missing key2
        },
      ];

      // Mock config to enable missing keys check
      mockDeps.configLoader.loadConfig = async () => ({
        baseDir: "/test",
        baseLanguagePath: "en.json",
        languagePaths: ["*.json"],
        projectFiles: [],
        checks: {
          missingKeys: true,
          unusedKeys: false,
          duplicateValues: false,
          verifyProjectKeys: false,
        },
        options: {
          missingKeys: "error",
          unusedKeys: "skip",
          duplicateValues: "skip",
          verifyProjectKeys: "skip",
        },
      });

      const freshProgram = new Command();
      const program = setupCommands(true, mockDeps, freshProgram); // exitOnError = true

      // Simulate running main action
      await program.parseAsync(["node", "test"]);

      expect(
        consoleErrors.some((msg) =>
          msg.includes("Exiting due to detected errors."),
        ),
      ).toBe(true);
      expect(exitCode).toBe(1);
    });
  });
});
