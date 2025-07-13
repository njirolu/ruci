import * as fs from "node:fs/promises";
import * as path from "node:path";

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  mock,
  spyOn,
  test,
} from "bun:test";

import { FileSystemError } from "../../src/core/errors";

describe("CLI Commands", () => {
  beforeEach(() => {
    mock.restore();
  });

  afterEach(() => {
    mock.restore();
  });

  test("should not throw error when importing setupCommands", async () => {
    const { setupCommands } = await import("../../src/cli/commands");
    expect(setupCommands).toBeDefined();
    expect(typeof setupCommands).toBe("function");
  });

  test("should setup init command correctly", async () => {
    const mockCommand = {
      description: mock(() => mockCommand),
      action: mock(() => mockCommand),
    };

    const mockProgram = {
      command: mock(() => mockCommand),
      action: mock(() => mockProgram),
      opts: mock(() => ({})),
      help: mock(() => {}),
    };

    mock.module("commander", () => ({
      program: mockProgram,
    }));

    const { setupCommands } = await import("../../src/cli/commands");
    setupCommands(false);

    expect(mockProgram.command).toHaveBeenCalledWith("init");
    expect(mockCommand.description).toHaveBeenCalledWith(
      "Initializes ruci.config.json in the current directory",
    );
  });

  test("should create config file on init command", async () => {
    const mockWriteFile = spyOn(fs, "writeFile").mockResolvedValue();
    const mockConsoleLog = spyOn(console, "log").mockImplementation(() => {});

    let initCallback: any;
    const mockCommand = {
      description: mock(() => mockCommand),
      action: mock((callback) => {
        initCallback = callback;
        return mockCommand;
      }),
    };

    const mockProgram = {
      command: mock(() => mockCommand),
      action: mock(() => mockProgram),
      opts: mock(() => ({})),
      help: mock(() => {}),
    };

    mock.module("commander", () => ({
      program: mockProgram,
    }));

    const { setupCommands } = await import("../../src/cli/commands");
    setupCommands(false);

    // Execute the init callback
    await initCallback();

    const expectedPath = path.join(process.cwd(), "ruci.config.json");
    expect(mockWriteFile).toHaveBeenCalledWith(
      expectedPath,
      expect.stringContaining("baseLanguagePath"),
    );
    expect(mockConsoleLog).toHaveBeenCalledWith(
      `Successfully created ${expectedPath}`,
    );
  });

  test("should handle file write error on init command", async () => {
    let initCallback: any;
    const mockCommand = {
      description: mock(() => mockCommand),
      action: mock((callback) => {
        initCallback = callback;
        return mockCommand;
      }),
    };

    const mockProgram = {
      command: mock(() => mockCommand),
      action: mock(() => mockProgram),
      opts: mock(() => ({})),
      help: mock(() => {}),
    };

    mock.module("commander", () => ({
      program: mockProgram,
    }));

    const { setupCommands } = await import("../../src/cli/commands");
    setupCommands(false);

    await expect(initCallback()).rejects.toThrow(FileSystemError);
  });

  test("should run missing keys check when enabled", async () => {
    let mainCallback: any;
    const mockProgram = {
      command: mock(() => ({
        description: mock(() => ({ action: mock(() => {}) })),
      })),
      action: mock((callback) => {
        mainCallback = callback;
        return mockProgram;
      }),
      opts: mock(() => ({ missingKeys: "error" })),
      help: mock(() => {}),
    };

    mock.module("commander", () => ({ program: mockProgram }));

    const mockLoadConfig = mock(async () => ({
      baseLanguagePath: "en.json",
      languagePaths: ["fr.json"],
      projectFiles: [],
      baseDir: "/test",
      options: {
        missingKeys: "error",
        unusedKeys: "skip",
        duplicateValues: "skip",
        verifyProjectKeys: "skip",
      },
    }));
    mock.module("../../src/config/loader", () => ({
      loadConfig: mockLoadConfig,
    }));

    const mockReadTranslationFile = mock(async () => ({
      path: "",
      data: { greeting: "Hello" },
    }));
    const mockReadTranslationFiles = mock(async () => [
      { path: "fr.json", data: { greeting: "Bonjour" } },
    ]);
    mock.module("../../src/core/services/file-reader", () => ({
      readTranslationFile: mockReadTranslationFile,
      readTranslationFiles: mockReadTranslationFiles,
    }));

    const { setupCommands } = await import("../../src/cli/commands");
    setupCommands(false);

    await mainCallback();
  });

  test("should run unused keys check when enabled", async () => {
    let mainCallback: any;
    const mockProgram = {
      command: mock(() => ({
        description: mock(() => ({ action: mock(() => {}) })),
      })),
      action: mock((callback) => {
        mainCallback = callback;
        return mockProgram;
      }),
      opts: mock(() => ({ unusedKeys: "error" })),
      help: mock(() => {}),
    };

    mock.module("commander", () => ({ program: mockProgram }));

    const mockLoadConfig = mock(async () => ({
      baseLanguagePath: "en.json",
      languagePaths: ["fr.json"],
      projectFiles: [],
      baseDir: "/test",
      options: {
        missingKeys: "skip",
        unusedKeys: "error",
        duplicateValues: "skip",
        verifyProjectKeys: "skip",
      },
    }));
    mock.module("../../src/config/loader", () => ({
      loadConfig: mockLoadConfig,
    }));

    const mockReadTranslationFile = mock(async () => ({
      path: "",
      data: { greeting: "Hello" },
    }));
    const mockReadTranslationFiles = mock(async () => [
      { path: "", data: { greeting: "Bonjour" } },
    ]);
    mock.module("../../src/core/services/file-reader", () => ({
      readTranslationFile: mockReadTranslationFile,
      readTranslationFiles: mockReadTranslationFiles,
    }));

    const { setupCommands } = await import("../../src/cli/commands");
    setupCommands(false);

    await mainCallback();
  });

  test("should run duplicate values check when enabled", async () => {
    let mainCallback: any;
    const mockProgram = {
      command: mock(() => ({
        description: mock(() => ({ action: mock(() => {}) })),
      })),
      action: mock((callback) => {
        mainCallback = callback;
        return mockProgram;
      }),
      opts: mock(() => ({ duplicateValues: "warn" })),
      help: mock(() => {}),
    };
    mock.module("commander", () => ({ program: mockProgram }));
    const mockLoadConfig = mock(async () => ({
      baseLanguagePath: "en.json",
      languagePaths: ["fr.json"],
      projectFiles: [],
      baseDir: "/test",
      options: {
        missingKeys: "skip",
        unusedKeys: "skip",
        duplicateValues: "warn",
        verifyProjectKeys: "skip",
      },
    }));
    mock.module("../../src/config/loader", () => ({
      loadConfig: mockLoadConfig,
    }));
    const mockReadTranslationFiles = mock(async () => []);
    mock.module("../../src/core/services/file-reader", () => ({
      readTranslationFiles: mockReadTranslationFiles,
    }));

    const { setupCommands } = await import("../../src/cli/commands");
    setupCommands(false);
    await mainCallback();
    expect(mockLoadConfig).toHaveBeenCalled();
    expect(mockReadTranslationFiles).toHaveBeenCalled();
  });

  test("should run verify project keys check when enabled", async () => {
    let mainCallback: any;
    const mockProgram = {
      command: mock(() => ({
        description: mock(() => ({ action: mock(() => {}) })),
      })),
      action: mock((callback) => {
        mainCallback = callback;
        return mockProgram;
      }),
      opts: mock(() => ({ verifyProjectKeys: "error" })),
      help: mock(() => {}),
    };
    mock.module("commander", () => ({ program: mockProgram }));
    const mockLoadConfig = mock(async () => ({
      baseLanguagePath: "en.json",
      languagePaths: [],
      projectFiles: ["**/*.ts"],
      baseDir: "/test",
      options: {
        missingKeys: "skip",
        unusedKeys: "skip",
        duplicateValues: "skip",
        verifyProjectKeys: "error",
      },
    }));
    mock.module("../../src/config/loader", () => ({
      loadConfig: mockLoadConfig,
    }));
    const mockReadTranslationFile = mock(async () => ({
      path: "en.json",
      data: {},
    }));
    mock.module("../../src/core/services/file-reader", () => ({
      readTranslationFile: mockReadTranslationFile,
    }));

    const { setupCommands } = await import("../../src/cli/commands");
    setupCommands(false);
    await mainCallback();
    expect(mockLoadConfig).toHaveBeenCalled();
    expect(mockReadTranslationFile).toHaveBeenCalled();
  });

  test("should show help and exit if baseLanguagePath is missing for missing keys check", async () => {
    let mainCallback: any;
    const mockProgram = {
      command: mock(() => ({
        description: mock(() => ({ action: mock(() => {}) })),
      })),
      action: mock((callback) => {
        mainCallback = callback;
        return mockProgram;
      }),
      opts: mock(() => ({ missingKeys: "error" })),
      help: mock(() => {}),
    };
    mock.module("commander", () => ({ program: mockProgram }));
    const mockLoadConfig = mock(async () => ({
      baseLanguagePath: "",
      languagePaths: ["fr.json"],
      projectFiles: [],
      baseDir: "/test",
      options: {
        missingKeys: "error",
        unusedKeys: "skip",
        duplicateValues: "skip",
        verifyProjectKeys: "skip",
      },
    }));
    mock.module("../../src/config/loader", () => ({
      loadConfig: mockLoadConfig,
    }));
    const mockConsoleError = spyOn(console, "error").mockImplementation(
      () => {},
    );

    const { setupCommands } = await import("../../src/cli/commands");
    setupCommands(false);
    await mainCallback();

    expect(mockConsoleError).toHaveBeenCalledWith(
      "Error: --base-language-path and --language-paths are required for missing keys check.",
    );
    expect(mockProgram.help).toHaveBeenCalled();
  });

  test("should show help and exit if baseLanguagePath is missing for unused keys check", async () => {
    let mainCallback: any;
    const mockProgram = {
      command: mock(() => ({
        description: mock(() => ({ action: mock(() => {}) })),
      })),
      action: mock((callback) => {
        mainCallback = callback;
        return mockProgram;
      }),
      opts: mock(() => ({ unusedKeys: "error" })),
      help: mock(() => {}),
    };
    mock.module("commander", () => ({ program: mockProgram }));
    const mockLoadConfig = mock(async () => ({
      baseLanguagePath: "",
      languagePaths: ["fr.json"],
      projectFiles: [],
      baseDir: "/test",
      options: {
        missingKeys: "skip",
        unusedKeys: "error",
        duplicateValues: "skip",
        verifyProjectKeys: "skip",
      },
    }));
    mock.module("../../src/config/loader", () => ({
      loadConfig: mockLoadConfig,
    }));
    const mockConsoleError = spyOn(console, "error").mockImplementation(
      () => {},
    );

    const { setupCommands } = await import("../../src/cli/commands");
    setupCommands(false);
    await mainCallback();

    expect(mockConsoleError).toHaveBeenCalledWith(
      "Error: --base-language-path and --language-paths are required for unused keys check.",
    );
    expect(mockProgram.help).toHaveBeenCalled();
  });

  test("should log success message when no missing keys are found", async () => {
    let mainCallback: any;
    const mockProgram = {
      command: mock(() => ({
        description: mock(() => ({ action: mock(() => {}) })),
      })),
      action: mock((callback) => {
        mainCallback = callback;
        return mockProgram;
      }),
      opts: mock(() => ({ missingKeys: "error" })),
      help: mock(() => {}),
    };
    mock.module("commander", () => ({ program: mockProgram }));
    const mockLoadConfig = mock(async () => ({
      baseLanguagePath: "en.json",
      languagePaths: ["fr.json"],
      projectFiles: [],
      baseDir: "/test",
      options: {
        missingKeys: "error",
        unusedKeys: "skip",
        duplicateValues: "skip",
        verifyProjectKeys: "skip",
      },
    }));
    mock.module("../../src/config/loader", () => ({
      loadConfig: mockLoadConfig,
    }));
    const mockReadTranslationFile = mock(async () => ({
      path: "en.json",
      data: { greeting: "Hello" },
    }));
    const mockReadTranslationFiles = mock(async () => [
      { path: "fr.json", data: { greeting: "Bonjour" } },
    ]);
    mock.module("../../src/core/services/file-reader", () => ({
      readTranslationFile: mockReadTranslationFile,
      readTranslationFiles: mockReadTranslationFiles,
    }));
    const mockConsoleInfo = spyOn(console, "info").mockImplementation(() => {});

    const { setupCommands } = await import("../../src/cli/commands");
    setupCommands(false);
    await mainCallback();

    expect(mockConsoleInfo).toHaveBeenCalledWith(
      expect.stringContaining("✅ [Missing Keys]"),
    );
  });

  test("should log success message when no unused keys are found", async () => {
    let mainCallback: any;
    const mockProgram = {
      command: mock(() => ({
        description: mock(() => ({ action: mock(() => {}) })),
      })),
      action: mock((callback) => {
        mainCallback = callback;
        return mockProgram;
      }),
      opts: mock(() => ({ unusedKeys: "error" })),
      help: mock(() => {}),
    };
    mock.module("commander", () => ({ program: mockProgram }));
    const mockLoadConfig = mock(async () => ({
      baseLanguagePath: "en.json",
      languagePaths: ["fr.json"],
      projectFiles: [],
      baseDir: "/test",
      options: {
        missingKeys: "skip",
        unusedKeys: "error",
        duplicateValues: "skip",
        verifyProjectKeys: "skip",
      },
    }));
    mock.module("../../src/config/loader", () => ({
      loadConfig: mockLoadConfig,
    }));
    const mockReadTranslationFile = mock(async () => ({
      path: "en.json",
      data: { greeting: "Hello", farewell: "Goodbye" },
    }));
    const mockReadTranslationFiles = mock(async () => [
      { path: "fr.json", data: { greeting: "Bonjour" } },
    ]);
    mock.module("../../src/core/services/file-reader", () => ({
      readTranslationFile: mockReadTranslationFile,
      readTranslationFiles: mockReadTranslationFiles,
    }));
    const mockConsoleInfo = spyOn(console, "info").mockImplementation(() => {});

    const { setupCommands } = await import("../../src/cli/commands");
    setupCommands(false);
    await mainCallback();

    expect(mockConsoleInfo).toHaveBeenCalledWith(
      expect.stringContaining("✅ [Unused Keys]"),
    );
  });

  test("should use cached files for multiple checks", async () => {
    let mainCallback: any;
    const mockProgram = {
      command: mock(() => ({
        description: mock(() => ({ action: mock(() => {}) })),
      })),
      action: mock((callback) => {
        mainCallback = callback;
        return mockProgram;
      }),
      opts: mock(() => ({ missingKeys: "warn", unusedKeys: "warn" })),
      help: mock(() => {}),
    };
    mock.module("commander", () => ({ program: mockProgram }));
    const mockLoadConfig = mock(async () => ({
      baseLanguagePath: "en.json",
      languagePaths: ["fr.json"],
      projectFiles: [],
      baseDir: "/test",
      options: {
        missingKeys: "warn",
        unusedKeys: "warn",
        duplicateValues: "skip",
        verifyProjectKeys: "skip",
      },
    }));
    mock.module("../../src/config/loader", () => ({
      loadConfig: mockLoadConfig,
    }));
    const mockReadTranslationFile = mock(async () => ({
      path: "en.json",
      data: {},
    }));
    const mockReadTranslationFiles = mock(async () => [
      { path: "fr.json", data: {} },
    ]);
    mock.module("../../src/core/services/file-reader", () => ({
      readTranslationFile: mockReadTranslationFile,
      readTranslationFiles: mockReadTranslationFiles,
    }));

    const { setupCommands } = await import("../../src/cli/commands");
    setupCommands(false);
    await mainCallback();

    expect(mockReadTranslationFile).toHaveBeenCalledTimes(1);
    expect(mockReadTranslationFiles).toHaveBeenCalledTimes(1);
  });

  test("should exit with error when missing keys are found and level is error", async () => {
    let mainCallback: any;
    const mockProgram = {
      command: mock(() => ({
        description: mock(() => ({ action: mock(() => {}) })),
      })),
      action: mock((callback) => {
        mainCallback = callback;
        return mockProgram;
      }),
      opts: mock(() => ({ missingKeys: "error" })),
      help: mock(() => {}),
    };
    mock.module("commander", () => ({ program: mockProgram }));
    const mockLoadConfig = mock(async () => ({
      baseLanguagePath: "en.json",
      languagePaths: ["fr.json"],
      projectFiles: [],
      baseDir: "/test",
      options: {
        missingKeys: "error",
        unusedKeys: "skip",
        duplicateValues: "skip",
        verifyProjectKeys: "skip",
      },
    }));
    mock.module("../../src/config/loader", () => ({
      loadConfig: mockLoadConfig,
    }));
    const mockReadTranslationFile = mock(async () => ({
      path: "en.json",
      data: { greeting: "Hello", farewell: "Goodbye" },
    }));
    const mockReadTranslationFiles = mock(async () => [
      { path: "fr.json", data: { greeting: "Bonjour" } },
    ]);
    mock.module("../../src/core/services/file-reader", () => ({
      readTranslationFile: mockReadTranslationFile,
      readTranslationFiles: mockReadTranslationFiles,
    }));
    const { setupCommands } = await import("../../src/cli/commands");
    setupCommands(false);
    await mainCallback();
  });

  test("should exit with error when unused keys are found and level is error", async () => {
    let mainCallback: any;
    const mockProgram = {
      command: mock(() => ({
        description: mock(() => ({ action: mock(() => {}) })),
      })),
      action: mock((callback) => {
        mainCallback = callback;
        return mockProgram;
      }),
      opts: mock(() => ({ unusedKeys: "error" })),
      help: mock(() => {}),
    };
    mock.module("commander", () => ({ program: mockProgram }));
    const mockLoadConfig = mock(async () => ({
      baseLanguagePath: "en.json",
      languagePaths: ["fr.json"],
      projectFiles: [],
      baseDir: "/test",
      options: {
        missingKeys: "skip",
        unusedKeys: "error",
        duplicateValues: "skip",
        verifyProjectKeys: "skip",
      },
    }));
    mock.module("../../src/config/loader", () => ({
      loadConfig: mockLoadConfig,
    }));
    const mockReadTranslationFile = mock(async () => ({
      path: "en.json",
      data: { greeting: "Hello" },
    }));
    const mockReadTranslationFiles = mock(async () => [
      { path: "fr.json", data: { greeting: "Bonjour", farewell: "Au revoir" } },
    ]);
    mock.module("../../src/core/services/file-reader", () => ({
      readTranslationFile: mockReadTranslationFile,
      readTranslationFiles: mockReadTranslationFiles,
    }));
    const { setupCommands } = await import("../../src/cli/commands");
    setupCommands(false);
    await mainCallback();
  });

  test("should setup main action with help when no checks enabled", async () => {
    let mainCallback: any;
    const mockProgram = {
      command: mock(() => ({
        description: mock(() => ({
          action: mock(() => {}),
        })),
      })),
      action: mock((callback) => {
        mainCallback = callback;
        return mockProgram;
      }),
      opts: mock(() => ({})),
      help: mock(() => {}),
    };

    mock.module("commander", () => ({
      program: mockProgram,
    }));

    mock.module("../../src/config/loader", () => ({
      loadConfig: mock(async () => ({
        baseLanguagePath: "",
        languagePaths: [],
        projectFiles: [],
        baseDir: "/test",
        options: {
          missingKeys: "skip",
          unusedKeys: "skip",
          duplicateValues: "skip",
          verifyProjectKeys: "skip",
        },
      })),
    }));

    const { setupCommands } = await import("../../src/cli/commands");
    setupCommands();

    // Execute the main callback
    await mainCallback();

    expect(mockProgram.help).toHaveBeenCalled();
  });
});
