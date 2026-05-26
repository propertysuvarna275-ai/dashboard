const { sendJson, sendError, getBody, createId, query, hashPassword } = require("../_helpers");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.end("Method Not Allowed");
    return;
  }

  const body = await getBody(req);
  const name = (body.name || "").trim();
  const email = (body.email || "").trim().toLowerCase();
  const password = (body.password || "").trim();
  if (!name || !email || !password) {
    return sendError(res, "Nama, email, dan password wajib diisi.", 400);
  }

  const existingUsers = await query("SELECT count(*) AS count FROM users");
  if (Number(existingUsers.rows[0].count) > 0) {
    return sendError(res, "Register hanya boleh dilakukan saat pertama kali setup.", 403);
  }

  const existing = await query("SELECT id FROM users WHERE email = $1", [email]);
  if (existing.rowCount > 0) {
    return sendError(res, "Email sudah terdaftar.", 409);
  }

  const id = createId("u");
  const hashed = hashPassword(password);
  await query(
    "INSERT INTO users (id, name, email, password, role, active) VALUES ($1, $2, $3, $4, $5, true)",
    [id, name, email, hashed, "Admin"]
  );

  const token = createId("session");
  await query("INSERT INTO sessions (token, user_id) VALUES ($1, $2)", [token, id]);
  sendJson(res, { success: true, token, user: { id, name, email, role: "Admin" } });
};
