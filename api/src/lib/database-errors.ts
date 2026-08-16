import { createErrorResponse, ErrorCode, type APIError } from "./api-errors";

type DatabaseErrorResponse = {
  status: 409 | 422;
  body: APIError;
};

const STABLE_ERRORS = [
  {
    code: ErrorCode.TEAM_CAPACITY_EXCEEDED,
    message: "Team participant capacity has been reached",
  },
  {
    code: ErrorCode.STORY_LIKE_COUNT_FAILED,
    message: "Story like count could not be updated",
  },
  {
    code: ErrorCode.MESSAGE_SUMMARY_FAILED,
    message: "Conversation summary could not be updated",
  },
] as const;

export function mapDatabaseError(error: unknown): DatabaseErrorResponse {
  const diagnostic = error instanceof Error ? error.message : String(error);
  const stable = STABLE_ERRORS.find(({ code }) => diagnostic.includes(code));
  if (stable) {
    return {
      status: 409,
      body: createErrorResponse(stable.code, stable.message),
    };
  }

  return {
    status: 422,
    body: createErrorResponse(
      ErrorCode.DATABASE_CONSTRAINT_FAILED,
      "The requested change violates a database constraint",
    ),
  };
}
