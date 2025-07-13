import { describe, it, expect } from "bun:test";
import {
  BaseError,
  ConfigValidationError,
} from "../../../src/core/errors/base.error";

describe("BaseError", () => {
  it("should create an instance of BaseError with correct properties", () => {
    const errorName = "TestError";
    const errorMessage = "This is a test error";
    const errorContext = { code: 123, detail: "some detail" };

    const error = new BaseError(errorName, errorMessage, errorContext);

    expect(error).toBeInstanceOf(BaseError);
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe(errorName);
    expect(error.message).toBe(errorMessage);
    expect(error.context).toEqual(errorContext);
    expect(error.cause).toBeUndefined();
    expect(error.stack).toBeDefined();
  });

  it("should handle cause and use its stack if available", () => {
    const cause = new Error("Original message");
    cause.stack = "Original stack trace";

    const error = new BaseError("WrappedError", "Wrapped message", {}, cause);

    expect(error.name).toBe("WrappedError");
    expect(error.message).toBe("Wrapped message");
    expect(error.cause).toBe(cause);
    expect(error.stack).toBe(cause.stack);
  });

  it("should capture stack trace if no cause stack is provided", () => {
    const error = new BaseError("NoCauseStackError", "Message");
    expect(error.stack).toBeDefined();
    expect(error.stack?.includes("NoCauseStackError")).toBeTrue();
  });

  it("should have an empty context by default", () => {
    const error = new BaseError("DefaultContextError", "Message");
    expect(error.context).toEqual({});
  });
});

describe("ConfigValidationError", () => {
  it("should create an instance of ConfigValidationError with correct properties", () => {
    const errorMessage = "Invalid configuration";
    const errorContext = { file: "config.json" };
    const cause = new Error("Parsing failed");

    const error = new ConfigValidationError(errorMessage, errorContext, cause);

    expect(error).toBeInstanceOf(ConfigValidationError);
    expect(error).toBeInstanceOf(BaseError);
    expect(error.name).toBe("ConfigValidationError");
    expect(error.message).toBe(errorMessage);
    expect(error.context).toEqual(errorContext);
    expect(error.cause).toBe(cause);
    expect(error.stack).toBeDefined();
  });

  it("should have default context as empty object", () => {
    const error = new ConfigValidationError("Message");
    expect(error.context).toEqual({});
  });
});
