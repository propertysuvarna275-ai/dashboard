const { sendJson, sendError, getBody, createId, requireAuth, query } = require("../../api/_helpers");

const CLIENT_FIELDS = [
  "name",
  "whatsapp",
  "source",
  "firstFollowUp",
  "status",
  "visited",
  "kavling",
  "result",
  "cancelReason",
  "nextFollowUp",
];

module.exports = async (req, res) => {
  if (req.method === "GET") {
    const auth = await requireAuth(req, res);
    if (!auth) return;
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    const q = (url.searchParams.get("q") || "").trim();
    const status = (url.searchParams.get("status") || "").trim();

    let sql = `SELECT c.*, u.name AS created_by_name FROM clients c LEFT JOIN users u ON c.created_by = u.id`;
    const filters = [];
    const values = [];
    if (status) {
      values.push(status);
      filters.push(`c.status = $${values.length}`);
    }
    if (q) {
      values.push(`%${q.toLowerCase()}%`);
      filters.push(`(LOWER(c.name) LIKE $${values.length} OR LOWER(c.whatsapp) LIKE $${values.length} OR LOWER(c.source) LIKE $${values.length} OR LOWER(c.kavling) LIKE $${values.length} OR LOWER(c.marketing) LIKE $${values.length})`);
    }
    if (filters.length) sql += ` WHERE ${filters.join(" AND ")}`;
    sql += ` ORDER BY c.created_at DESC`;
    const result = await query(sql, values);
    const clients = result.rows.map((row) => ({ ...row, history: row.history || [] }));
    return sendJson(res, { success: true, clients });
  }

  if (req.method === "POST") {
    const auth = await requireAuth(req, res);
    if (!auth) return;
    if (!["Admin", "Marketing"].includes(auth.role)) {
      return sendError(res, "Akses ditolak.", 403);
    }
    const body = await getBody(req);
    const data = {};
    CLIENT_FIELDS.forEach((field) => {
      data[field] = (body[field] || "").trim();
    });
    if (!data.name || !data.whatsapp || !data.source || !data.firstFollowUp || !data.status || !data.visited) {
      return sendError(res, "Field wajib belum lengkap.", 400);
    }
    const id = createId("c");
    const marketing = auth.name;
    const nextFollowUp = data.nextFollowUp || null;
    await query(
      `INSERT INTO clients (id, name, whatsapp, source, first_follow_up, status, visited, kavling, result, cancel_reason, next_follow_up, marketing, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [id, data.name, data.whatsapp, data.source, data.firstFollowUp, data.status, data.visited, data.kavling, data.result, data.cancelReason, nextFollowUp, marketing, auth.id]
    );
    const historyId = createId("h");
    const title = "Follow up awal";
    const note = data.result || "Client dibuat oleh sistem.";
    await query(
      `INSERT INTO client_history (id, client_id, date, title, note, created_by, created_by_name)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [historyId, id, data.firstFollowUp, title, note, auth.id, auth.name]
    );
    return sendJson(res, { success: true, client: { id, marketing, ...data } });
  }

  res.statusCode = 405;
  res.end("Method Not Allowed");
};
