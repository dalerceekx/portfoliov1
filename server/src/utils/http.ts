/** Errors that are safe to show to a client. Everything else becomes a 500. */
export class AppError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(status: number, message: string, code = 'ERROR', details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  static badRequest(message = 'Invalid request.', details?: unknown) {
    return new AppError(400, message, 'BAD_REQUEST', details);
  }
  static unauthorized(message = 'Authentication required.') {
    return new AppError(401, message, 'UNAUTHORIZED');
  }
  static forbidden(message = 'You do not have access to this resource.') {
    return new AppError(403, message, 'FORBIDDEN');
  }
  static notFound(message = 'Not found.') {
    return new AppError(404, message, 'NOT_FOUND');
  }
  static conflict(message = 'This value is already in use.') {
    return new AppError(409, message, 'CONFLICT');
  }
  static tooMany(message = 'Too many requests. Try again later.') {
    return new AppError(429, message, 'RATE_LIMITED');
  }
}

export type ApiSuccess<T> = { success: true; data: T };
export type ApiFailure = { success: false; message: string; code: string; errors?: unknown };

export const ok = <T>(data: T): ApiSuccess<T> => ({ success: true, data });
