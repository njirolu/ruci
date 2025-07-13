import { BaseError } from "./base.error";
import type { ErrorContext } from "@/types/error";

export class ParsingError extends BaseError {
  constructor(message: string, context?: ErrorContext, originalError?: Error) {
    super("ParsingError", message, context, originalError);
  }
}

export class InvalidJsonError extends BaseError {
  public readonly filePath: string;

  constructor(
    filePath: string,
    message: string,
    context?: ErrorContext,
    originalError?: Error,
  ) {
    super(
      "InvalidJsonError",
      `Invalid JSON in file ${filePath}: ${message}`,
      context,
      originalError,
    );
    this.filePath = filePath;
  }
}
