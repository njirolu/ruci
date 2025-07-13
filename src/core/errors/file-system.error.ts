import { BaseError } from "./base.error";
import { ErrorContext } from "@/types/error";

export class FileSystemError extends BaseError {
  constructor(message: string, context?: ErrorContext, cause?: unknown) {
    super("FileSystemError", message, context, cause);
  }
}

export class FileNotFoundError extends BaseError {
  public readonly filePath: string;

  constructor(filePath: string, context?: ErrorContext, cause?: unknown) {
    super(
      "FileNotFoundError",
      `File not found at path: ${filePath}`,
      context,
      cause,
    );
    this.filePath = filePath;
  }
}
