const { sendJson, sendError, getBody, createId, parsePath, requireAuth, requireAdmin, query } = require("./_helpers");

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

async function handleList(req, res) {
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
  const clients = result.rows.map((row) => ({
    ...row,
    history: row.history || [],
  }));
  sendJson(res, { success: true, clients });
}

async function handleCreate(req, res) {
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
  sendJson(res, { success: true, client: { id, marketing, ...data } });
}

async function handleDetail(req, res, clientId) {
  const auth = await requireAuth(req, res);
  if (!auth) return;
  const result = await query("SELECT c.*, u.name AS created_by_name FROM clients c LEFT JOIN users u ON c.created_by = u.id WHERE c.id = $1", [clientId]);
  const client = result.rows[0];
  if (!client) return sendError(res, "Konsumen tidak ditemukan.", 404);
  const historyData = await query(
    `SELECT id, client_id, date, title, note, created_by_name, created_at
      FROM client_history
      WHERE client_id = $1
      ORDER BY created_at DESC`,
    [clientId]
  );
  client.history = historyData.rows;
  sendJson(res, { success: true, client });
}

async function handleUpdate(req, res, clientId) {
  const auth = await requireAuth(req, res);
  if (!auth) return;
  if (auth.role !== "Admin") {
    return sendError(res, "Hanya Admin yang boleh mengubah data konsumen.", 403);
  }
  const body = await getBody(req);
  const updates = [];
  const values = [];
  let index = 1;
  CLIENT_FIELDS.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      updates.push(`${field === "firstFollowUp" ? "first_follow_up" : field === "cancelReason" ? "cancel_reason" : field === "nextFollowUp" ? "next_follow_up" : field} = $${index}`);
      let value = body[field];
      if (field === "nextFollowUp") {
        value = value || null;
      }
      values.push(value);
      index += 1;
    }
  });
  if (updates.length === 0) return sendError(res, "Tidak ada perubahan.", 400);
  values.push(clientId);
  await query(`UPDATE clients SET ${updates.join(", ")} WHERE id = $${index}`, values);
  sendJson(res, { success: true });
}

async function handleDelete(req, res, clientId) {
  const auth = await requireAuth(req, res);
  if (!auth) return;
  if (auth.role !== "Admin") {
    return sendError(res, "Hanya Admin yang boleh menghapus data konsumen.", 403);
  }
  await query("DELETE FROM clients WHERE id = $1", [clientId]);
  sendJson(res, { success: true });
}

async function handleHistory(req, res, clientId) {
  const auth = await requireAuth(req, res);
  if (!auth) return;
  if (!["Admin", "Marketing"].includes(auth.role)) {
    return sendError(res, "Akses ditolak.", 403);
  }
  const body = await getBody(req);
  const date = body.date || new Date().toISOString().slice(0, 10);
  const note = (body.note || "").trim();
  if (!note) return sendError(res, "Catatan follow up wajib diisi.", 400);
  const historyId = createId("h");
  await query(
    `INSERT INTO client_history (id, client_id, date, title, note, created_by, created_by_name)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [historyId, clientId, date, "Follow up", note, auth.id, auth.name]
  );
  sendJson(res, { success: true });
}

module.exports = async (req, res) => {
  const path = parsePath(req);
  const parts = path.split("/").filter(Boolean);
  const clientId = parts[2] || null;
  const action = parts[3] || null;

  if (req.method === "GET" && path === "/api/clients") return handleList(req, res);
  if (req.method === "POST" && path === "/api/clients") return handleCreate(req, res);
  if (clientId && req.method === "GET" && !action) return handleDetail(req, res, clientId);
  if (clientId && req.method === "PATCH" && !action) return handleUpdate(req, res, clientId);
  if (clientId && req.method === "DELETE" && !action) return handleDelete(req, res, clientId);
  if (clientId && req.method === "POST" && action === "history") return handleHistory(req, res, clientId);

  res.statusCode = 404;
  res.end("Not found");
};
