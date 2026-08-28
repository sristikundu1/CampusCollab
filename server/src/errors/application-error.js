export class ApplicationError extends Error {
  constructor({ code, message, status = 500, details = [], expose = status < 500, cause }) {
    super(message, { cause });
    this.name = this.constructor.name;
    this.code = code;
    this.status = status;
    this.details = details;
    this.expose = expose;
  }
}

export class RequestValidationError extends ApplicationError {
  constructor(details) {
    super({ code: 'VALIDATION_FAILED', message: 'One or more request values are invalid.', status: 422, details });
  }
}

export class AuthenticationError extends ApplicationError {
  constructor(code = 'AUTHENTICATION_REQUIRED', message = 'Authentication is required.') {
    super({ code, message, status: 401 });
  }
}

export class AuthorizationError extends ApplicationError {
  constructor(code = 'ACTION_FORBIDDEN', message = 'This action is not permitted.') {
    super({ code, message, status: 403 });
  }
}

export class NotFoundError extends ApplicationError {
  constructor() {
    super({ code: 'RESOURCE_NOT_FOUND', message: 'The requested resource was not found.', status: 404 });
  }
}

export class ConflictError extends ApplicationError {
  constructor(code = 'RESOURCE_CONFLICT', message = 'The request conflicts with the current resource state.') {
    super({ code, message, status: 409 });
  }
}

export class RateLimitError extends ApplicationError {
  constructor() {
    super({ code: 'RATE_LIMITED', message: 'Too many requests. Try again later.', status: 429 });
  }
}

export class DependencyUnavailableError extends ApplicationError {
  constructor(code = 'DEPENDENCY_UNAVAILABLE', message = 'A required service is temporarily unavailable.') {
    super({ code, message, status: 503 });
  }
}
