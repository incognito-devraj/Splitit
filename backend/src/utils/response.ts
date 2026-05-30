import { Response } from 'express';

export interface ApiSuccess<T> {
  success: true;
  data: T;
  pagination?: PaginationMeta;
}

export interface ApiError {
  success: false;
  message: string;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export function ok<T>(res: Response, data: T, pagination?: PaginationMeta): void {
  const body: ApiSuccess<T> = { success: true, data };
  if (pagination) body.pagination = pagination;
  res.status(200).json(body);
}

export function created<T>(res: Response, data: T): void {
  res.status(201).json({ success: true, data } satisfies ApiSuccess<T>);
}

export function noContent(res: Response): void {
  res.status(204).send();
}

export function badRequest(res: Response, message: string): void {
  res.status(400).json({ success: false, message } satisfies ApiError);
}

export function unauthorized(res: Response, message = 'Authentication required'): void {
  res.status(401).json({ success: false, message } satisfies ApiError);
}

export function forbidden(res: Response, message = 'Forbidden'): void {
  res.status(403).json({ success: false, message } satisfies ApiError);
}

export function notFound(res: Response, message = 'Not found'): void {
  res.status(404).json({ success: false, message } satisfies ApiError);
}

export function conflict(res: Response, message: string): void {
  res.status(409).json({ success: false, message } satisfies ApiError);
}

export function serverError(res: Response, message = 'Internal server error'): void {
  res.status(500).json({ success: false, message } satisfies ApiError);
}

export function paginate(total: number, page: number, limit: number): PaginationMeta {
  const totalPages = Math.ceil(total / limit);
  return { total, page, limit, totalPages, hasNext: page < totalPages, hasPrev: page > 1 };
}
