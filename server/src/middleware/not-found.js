import { NotFoundError } from '../errors/application-error.js';

export function notFoundHandler(_request, _response, next) {
  next(new NotFoundError());
}

