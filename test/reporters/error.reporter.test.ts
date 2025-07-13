import {
  describe,
  it,
  expect,
  mock,
  spyOn,
  beforeEach,
  afterEach,
} from "bun:test";
import { handle } from "../../src/reporters/error.reporter";
import {
  BaseError,
  FileNotFoundError,
  InvalidJsonError,
} from "../../src/core/errors";

describe("Error Reporter", () => {
  let consoleErrorSpy: ReturnType<typeof spyOn>;
  let processExitSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    mock.restore();
    consoleErrorSpy = spyOn(console, "error").mockImplementation(() => {});
    processExitSpy = spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit was called");
    });
  });

  afterEach(() => {
    mock.restore();
  });

  it("should handle FileNotFoundError", () => {
    const error = new FileNotFoundError("/path/to/nonexistent.json");
    expect(() => handle(error)).toThrow("process.exit was called");
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "❌ ERROR: File not found: /path/to/nonexistent.json",
    );
  });

  it("should handle InvalidJsonError", () => {
    const error = new InvalidJsonError(
      "/path/to/invalid.json",
      "Unexpected token",
    );
    expect(() => handle(error)).toThrow("process.exit was called");
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "❌ ERROR: Invalid JSON in file: /path/to/invalid.json. Details: Invalid JSON in file /path/to/invalid.json: Unexpected token",
    );
  });

  it("should handle BaseError with context", () => {
    const error = new BaseError("CustomError", "Something went wrong", {
      path: "/data/file.txt",
      line: 10,
    });
    expect(() => handle(error)).toThrow("process.exit was called");
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      `❌ [CustomError] Something went wrong
  Path: /data/file.txt
  Line: 10`,
    );
  });

  it("should handle BaseError with cause stack", () => {
    const cause = new Error("Original issue");
    cause.stack = "Original stack trace here";
    const error = new BaseError("WrappedError", "Wrapped message", {}, cause);
    expect(() => handle(error)).toThrow("process.exit was called");
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "❌ [WrappedError] Wrapped message",
    );
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Cause:",
      "Original stack trace here",
    );
  });

  it("should handle generic Error", () => {
    const error = new Error("Generic problem");
    error.stack = "Generic stack trace";
    expect(() => handle(error)).toThrow("process.exit was called");
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "❌ An unexpected error occurred: Generic problem",
    );
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Stack:",
      "Generic stack trace",
    );
  });

  it("should handle unknown error", () => {
    const error = "a string error";
    expect(() => handle(error)).toThrow("process.exit was called");
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "❌ An unexpected and unknown error occurred.",
    );
  });

  it("should handle BaseError without context and without cause", () => {
    const error = new BaseError("SimpleError", "A simple error message");
    expect(() => handle(error)).toThrow("process.exit was called");
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "❌ [SimpleError] A simple error message",
    );
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
  });

  it("should handle generic Error without a stack", () => {
    const error = new Error("Generic problem without stack");
    error.stack = undefined;
    expect(() => handle(error)).toThrow("process.exit was called");
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "❌ An unexpected error occurred: Generic problem without stack",
    );
    expect(consoleErrorSpy).not.toHaveBeenCalledWith(
      expect.stringContaining("Stack:"),
    );
  });

  it("should always call process.exit", () => {
    const error = new Error("Test");
    expect(() => handle(error)).toThrow("process.exit was called");
    expect(processExitSpy).toHaveBeenCalledWith(1);
  });
});
