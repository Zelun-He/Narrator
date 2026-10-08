import { getDatabase } from "./database";
import { ApiError } from "./errors";

export function pagination(request: Request) {
  const url = new URL(request.url);
  const page = Number(url.searchParams.get("page") ?? 1);
  const search = (url.searchParams.get("search") ?? "").trim();
  if (!Number.isSafeInteger(page) || page < 1 || page > 100000 || search.length > 100)
    throw new ApiError(400, "Invalid page or search.");
  return { page, search, limit: 20, offset: (page - 1) * 20 };
}

export function accountList(request: Request) {
  const { page, search, limit, offset } = pagination(request);
  const db = getDatabase();
  const where = "instr(lower(u.email),lower(?)) > 0 OR instr(lower(u.name),lower(?)) > 0";
  const { total } = db.prepare(`SELECT COUNT(*) AS total FROM user u WHERE ${where}`).get(search, search) as { total: number };
  const users = db.prepare(`SELECT u.id,u.name,u.email,u.role,u.banned,u.createdAt,
    (SELECT COUNT(*) FROM books b WHERE b.owner_id=u.id) AS books,
    (SELECT COUNT(*) FROM session s WHERE s.userId=u.id AND s.expiresAt>?) AS sessions
    FROM user u WHERE ${where} ORDER BY u.createdAt DESC,u.id LIMIT ? OFFSET ?`)
    .all(Date.now(), search, search, limit, offset);
  return { users, total, page, pages: Math.max(1, Math.ceil(total / limit)) };
}

export function requestHistory(ownerId: string, request: Request) {
  const { page, search, limit, offset } = pagination(request);
  const db = getDatabase();
  const where = "b.owner_id=? AND instr(lower(b.title),lower(?))>0";
  const { total } = db.prepare(`SELECT COUNT(*) AS total FROM request_events e JOIN books b ON b.id=e.book_id WHERE ${where}`)
    .get(ownerId, search) as { total: number };
  const events = db.prepare(`SELECT e.id,e.book_id AS bookId,b.title,e.state,e.attempt,e.recorded_at AS recordedAt
    FROM request_events e JOIN books b ON b.id=e.book_id WHERE ${where}
    ORDER BY e.id DESC LIMIT ? OFFSET ?`).all(ownerId, search, limit, offset);
  return { events, total, page, pages: Math.max(1, Math.ceil(total / limit)) };
}
