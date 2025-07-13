import { ErrorContext } from "@/types/error";

export class BaseError extends Error {
  public readonly context: ErrorContext;
  public override readonly name: string;

  constructor(
    name: string,
    message: string,
    context: ErrorContext = {},
    cause?: unknown,
  ) {
    super(message, { cause });
    this.name = name;
    this.context = context;
    Object.setPrototypeOf(this, new.target.prototype);

    if (cause instanceof Error && cause.stack) {
      this.stack = cause.stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export class ConfigValidationError extends BaseError {
  constructor(message: string, context?: ErrorContext, cause?: unknown) {
    super("ConfigValidationError", message, context, cause);
  }
}
