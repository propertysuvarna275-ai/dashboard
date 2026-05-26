const { sendJson, sendError, getBody, createId, requireAdmin, query, hashPassword } = require("../../api/_helpers");

module.exports = async (req, res) => {
  if (req.method === "GET") {
    const auth = await requireAdmin(req, res);
    if (!auth) return;
    const result = await query(
      `SELECT id, name, email, role, active, created_at FROM users ORDER BY created_at DESC`
    );
    return sendJson(res, { success: true, users: result.rows });
  }

  if (req.method === "POST") {
    const auth = await requireAdmin(req, res);
    if (!auth) return;
    const body = await getBody(req);
    const name = (body.name || "").trim();
    const email = (body.email || "").trim().toLowerCase();
    const password = (body.password || "").trim();
    const role = ["Admin", "Manager", "Marketing"].includes(body.role) ? body.role : "Marketing";
    if (!name || !email || !password) {
      return sendError(res, "Nama, email, dan password wajib diisi.", 400);
    }
    const existing = await query("SELECT id FROM users WHERE email = $1", [email]);
    if (existing.rowCount > 0) {
      return sendError(res, "Email sudah terdaftar.", 409);
    }
    const id = createId("u");
    const hashed = hashPassword(password);
    await query(
      "INSERT INTO users (id, name, email, password, role, active) VALUES ($1, $2, $3, $4, $5, true)",
      [id, name, email, hashed, role]
    );
    const result = await query("SELECT id, name, email, role, active, created_at FROM users WHERE id = $1", [id]);
    return sendJson(res, { success: true, user: result.rows[0] });
  }

  res.statusCode = 405;
  res.end("Method Not Allowed");
};
