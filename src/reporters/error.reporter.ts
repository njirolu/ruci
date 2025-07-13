import { BaseError, FileNotFoundError, InvalidJsonError } from "@/core/errors";

function getErrorMessage(error: BaseError): string {
  let message = error.message;
  if (error.context?.path) {
    message += `\n  Path: ${error.context.path}`;
  }
  if (error.context?.line) {
    message += `\n  Line: ${error.context.line}`;
  }
  return message;
}

export function handle(error: unknown): void {
  if (error instanceof FileNotFoundError) {
    console.error(`❌ ERROR: File not found: ${error.filePath}`);
  } else if (error instanceof InvalidJsonError) {
    console.error(
      `❌ ERROR: Invalid JSON in file: ${error.filePath}. Details: ${error.message}`,
    );
  } else if (error instanceof BaseError) {
    console.error(`❌ [${error.name}] ${getErrorMessage(error)}`);
    if (error.cause instanceof Error && error.cause.stack) {
      console.error("Cause:", error.cause.stack);
    }
  } else if (error instanceof Error) {
    console.error(`❌ An unexpected error occurred: ${error.message}`);
    if (error.stack) {
      console.error("Stack:", error.stack);
    }
  } else {
    console.error("❌ An unexpected and unknown error occurred.");
  }

  process.exit(1);
}
