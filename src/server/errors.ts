import "server-only";

/** An expected failure. Its message is written for the user and safe to show them. */
export class AppError extends Error {}

export class NotFoundError extends AppError {
  constructor(what: string) {
    super(`${what} not found.`);
  }
}
