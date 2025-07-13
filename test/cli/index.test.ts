import { beforeEach, describe, expect, mock, test } from "bun:test";

describe("CLI Index", () => {
  beforeEach(() => {
    mock.restore();
  });

  test("should not throw error when importing run function", async () => {
    const { run } = await import("../../src/cli");
    expect(run).toBeDefined();
    expect(typeof run).toBe("function");
  });

  test("should be able to call run function without throwing", async () => {
    // Mock commander to avoid actual CLI execution
    const mockCommand = {
      description: mock(() => mockCommand),
      option: mock(() => mockCommand),
      action: mock(() => mockCommand),
    };

    const mockProgram = {
      parseAsync: mock(() => Promise.resolve()),
      option: mock(() => mockProgram), // Return self for chaining
      command: mock(() => mockCommand),
      action: mock(() => mockProgram), // Add action method for program
    };

    mock.module("commander", () => ({
      program: mockProgram,
    }));

    const { run } = await import("../../src/cli");

    // Test that run function executes without throwing
    let error: Error | undefined;
    try {
      await run();
    } catch (e) {
      error = e;
    }

    expect(error).toBeUndefined();
  });
});
