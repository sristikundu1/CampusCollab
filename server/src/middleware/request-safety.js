import { ApplicationError } from '../errors/application-error.js';

function hasUnsafeKey(value) {
  if (!value || typeof value !== 'object') return false;
  if (Array.isArray(value)) return value.some(hasUnsafeKey);
  return Object.entries(value).some(([key, child]) => key.startsWith('$') || key.includes('.') || hasUnsafeKey(child));
}

export function rejectUnsafeDocumentKeys(request, _response, next) {
  if (hasUnsafeKey(request.body)) {
    return next(new ApplicationError({ code: 'UNSAFE_INPUT', message: 'The request contains unsupported field names.', status: 400 }));
  }
  return next();
}

export function rejectDuplicateQueryParameters(request, _response, next) {
  const seen = new Set();
  for (const [key] of new URL(request.originalUrl, 'http://localhost').searchParams) {
    if (seen.has(key)) {
      return next(new ApplicationError({ code: 'DUPLICATE_QUERY_PARAMETER', message: `Query parameter '${key}' must not be repeated.`, status: 400 }));
    }
    seen.add(key);
  }
  return next();
}

