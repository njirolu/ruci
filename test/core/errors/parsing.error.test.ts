import { describe, it, expect } from "bun:test";
import {
  ParsingError,
  InvalidJsonError,
} from "../../../src/core/errors/parsing.error";
import { BaseError } from "../../../src/core/errors/base.error";

describe("ParsingError", () => {
  it("should create an instance of ParsingError with correct properties", () => {
    const errorMessage = "Failed to parse content";
    const errorContext = { type: "JSON" };
    const cause = new Error("Unexpected token");

    const error = new ParsingError(errorMessage, errorContext, cause);

    expect(error).toBeInstanceOf(ParsingError);
    expect(error).toBeInstanceOf(BaseError);
    expect(error.name).toBe("ParsingError");
    expect(error.message).toBe(errorMessage);
    expect(error.context).toEqual(errorContext);
    expect(error.cause).toBe(cause);
    expect(error.stack).toBeDefined();
  });

  it("should have default context as empty object", () => {
    const error = new ParsingError("Message");
    expect(error.context).toEqual({});
  });
});

describe("InvalidJsonError", () => {
  it("should create an instance of InvalidJsonError with correct properties", () => {
    const filePath = "/path/to/invalid.json";
    const errorMessage = "Unexpected end of JSON input";
    const errorContext = { line: 1, column: 10 };
    const cause = new SyntaxError("JSON parse error");

    const error = new InvalidJsonError(
      filePath,
      errorMessage,
      errorContext,
      cause,
    );

    expect(error).toBeInstanceOf(InvalidJsonError);
    expect(error).toBeInstanceOf(BaseError);
    expect(error.name).toBe("InvalidJsonError");
    expect(error.message).toBe(
      `Invalid JSON in file ${filePath}: ${errorMessage}`,
    );
    expect(error.filePath).toBe(filePath);
    expect(error.context).toEqual(errorContext);
    expect(error.cause).toBe(cause);
    expect(error.stack).toBeDefined();
  });

  it("should have default context as empty object", () => {
    const filePath = "/path/to/invalid.json";
    const errorMessage = "Unexpected end of JSON input";
    const error = new InvalidJsonError(filePath, errorMessage);
    expect(error.context).toEqual({});
  });
});
