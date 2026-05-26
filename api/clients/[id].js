const { sendJson, sendError, getBody, requireAuth, requireAdmin, query } = require("../../api/_helpers");

module.exports = async (req, res) => {
  const parts = req.url.split("/").filter(Boolean);
  const id = parts[parts.length - 1];
  if (!id) {
    res.statusCode = 404;
    res.end("Not found");
    return;
  }

  if (req.method === "GET") {
    const auth = await requireAuth(req, res);
    if (!auth) return;
    const result = await query("SELECT c.*, u.name AS created_by_name FROM clients c LEFT JOIN users u ON c.created_by = u.id WHERE c.id = $1", [id]);
    const client = result.rows[0];
    if (!client) return sendError(res, "Konsumen tidak ditemukan.", 404);
    const historyData = await query(
      `SELECT id, client_id, date, title, note, created_by_name, created_at
       FROM client_history
       WHERE client_id = $1
       ORDER BY created_at DESC`,
      [id]
    );
    client.history = historyData.rows;
    return sendJson(res, { success: true, client });
  }

  if (req.method === "PATCH") {
    const auth = await requireAdmin(req, res);
    if (!auth) return;
    const body = await getBody(req);
    const updates = [];
    const values = [];
    let index = 1;
    const fieldMap = {
      firstFollowUp: "first_follow_up",
      cancelReason: "cancel_reason",
      nextFollowUp: "next_follow_up",
    };
    ["name", "whatsapp", "source", "firstFollowUp", "status", "visited", "kavling", "result", "cancelReason", "nextFollowUp", "marketing"].forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(body, field)) {
        const column = fieldMap[field] || field;
        updates.push(`${column} = $${index}`);
        let value = body[field];
        if (field === "nextFollowUp") {
          value = value || null;
        }
        values.push(value);
        index += 1;
      }
    });
    if (updates.length === 0) return sendError(res, "Tidak ada perubahan.", 400);
    values.push(id);
    await query(`UPDATE clients SET ${updates.join(", ")} WHERE id = $${index}`, values);
    return sendJson(res, { success: true });
  }

  if (req.method === "DELETE") {
    const auth = await requireAdmin(req, res);
    if (!auth) return;
    await query("DELETE FROM clients WHERE id = $1", [id]);
    return sendJson(res, { success: true });
  }

  res.statusCode = 405;
  res.end("Method Not Allowed");
};
