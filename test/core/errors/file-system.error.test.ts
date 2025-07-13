import { describe, it, expect } from "bun:test";
import {
  FileSystemError,
  FileNotFoundError,
} from "../../../src/core/errors/file-system.error";
import { BaseError } from "../../../src/core/errors/base.error";

describe("FileSystemError", () => {
  it("should create an instance of FileSystemError with correct properties", () => {
    const errorMessage = "Failed to write file";
    const errorContext = { path: "/tmp/test.txt" };
    const cause = new Error("Permission denied");

    const error = new FileSystemError(errorMessage, errorContext, cause);

    expect(error).toBeInstanceOf(FileSystemError);
    expect(error).toBeInstanceOf(BaseError);
    expect(error.name).toBe("FileSystemError");
    expect(error.message).toBe(errorMessage);
    expect(error.context).toEqual(errorContext);
    expect(error.cause).toBe(cause);
    expect(error.stack).toBeDefined();
  });

  it("should have default context as empty object", () => {
    const error = new FileSystemError("Message");
    expect(error.context).toEqual({});
  });
});

describe("FileNotFoundError", () => {
  it("should create an instance of FileNotFoundError with correct properties", () => {
    const filePath = "/nonexistent/file.json";
    const errorContext = { operation: "read" };
    const cause = new Error("ENOENT");

    const error = new FileNotFoundError(filePath, errorContext, cause);

    expect(error).toBeInstanceOf(FileNotFoundError);
    expect(error).toBeInstanceOf(BaseError);
    expect(error.name).toBe("FileNotFoundError");
    expect(error.message).toBe(`File not found at path: ${filePath}`);
    expect(error.filePath).toBe(filePath);
    expect(error.context).toEqual(errorContext);
    expect(error.cause).toBe(cause);
    expect(error.stack).toBeDefined();
  });

  it("should have default context as empty object", () => {
    const filePath = "/nonexistent/file.json";
    const error = new FileNotFoundError(filePath);
    expect(error.context).toEqual({});
  });
});
