import { RequestValidationError } from '../errors/application-error.js';

function formatIssues(issues) {
  return issues.map((issue) => ({
    location: String(issue.path[0] ?? 'request'),
    path: issue.path.slice(1).join('.'),
    code: issue.code,
    message: issue.message,
  }));
}

export function validateRequest(schema) {
  return (request, _response, next) => {
    const result = schema.safeParse({ params: request.params, query: request.query, body: request.body });
    if (!result.success) return next(new RequestValidationError(formatIssues(result.error.issues)));
    request.validated = result.data;
    return next();
  };
}

