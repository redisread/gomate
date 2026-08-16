/**
 * Unified API Error Types and Helpers
 *
 * Provides consistent error response format across all API endpoints.
 */

/**
 * Standard error codes used across the API
 */
export enum ErrorCode {
  // Client errors (4xx)
  BAD_REQUEST = 'BAD_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  RATE_LIMITED = 'RATE_LIMITED',
  // Server errors (5xx)
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  WRITE_PROTECTED = 'WRITE_PROTECTED',
  BAD_GATEWAY = 'BAD_GATEWAY',
  TEAM_CAPACITY_EXCEEDED = 'TEAM_CAPACITY_EXCEEDED',
  STORY_LIKE_COUNT_FAILED = 'STORY_LIKE_COUNT_FAILED',
  MESSAGE_SUMMARY_FAILED = 'MESSAGE_SUMMARY_FAILED',
  DATABASE_CONSTRAINT_FAILED = 'DATABASE_CONSTRAINT_FAILED',
}

/**
 * Standard error response structure
 */
export interface APIError {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: unknown;
  };
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(
  code: ErrorCode,
  message: string,
  details?: unknown
): APIError {
  return {
    success: false,
    error: {
      code,
      message,
      ...(details !== undefined && { details }),
    },
  };
}

/**
 * Common error response helpers
 */
export const APIErrors = {
  badRequest: (message: string, details?: unknown) =>
    createErrorResponse(ErrorCode.BAD_REQUEST, message, details),

  unauthorized: (message: string = 'Unauthorized') =>
    createErrorResponse(ErrorCode.UNAUTHORIZED, message),

  forbidden: (message: string = 'Forbidden') =>
    createErrorResponse(ErrorCode.FORBIDDEN, message),

  notFound: (message: string = 'Not found') =>
    createErrorResponse(ErrorCode.NOT_FOUND, message),

  conflict: (message: string, details?: unknown) =>
    createErrorResponse(ErrorCode.CONFLICT, message, details),

  validationError: (message: string, details?: unknown) =>
    createErrorResponse(ErrorCode.VALIDATION_ERROR, message, details),

  rateLimited: (message: string = 'Too many requests') =>
    createErrorResponse(ErrorCode.RATE_LIMITED, message),

  internalError: (message: string = 'Internal server error', details?: unknown) =>
    createErrorResponse(ErrorCode.INTERNAL_ERROR, message, details),

  serviceUnavailable: (message: string = 'Service unavailable') =>
    createErrorResponse(ErrorCode.SERVICE_UNAVAILABLE, message),

  writeProtected: (message: string = 'Writes are temporarily protected') =>
    createErrorResponse(ErrorCode.WRITE_PROTECTED, message),

  badGateway: (message: string = 'Bad gateway', details?: unknown) =>
    createErrorResponse(ErrorCode.BAD_GATEWAY, message, details),
};
