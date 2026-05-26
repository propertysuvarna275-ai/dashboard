const { sendJson, sendError, getBody, createId, query, parsePath, hashPassword } = require("./_helpers");

async function handleStatus(req, res) {
  const result = await query("SELECT count(*) AS count FROM users");
  const hasUsers = Number(result.rows[0].count) > 0;
  sendJson(res, { success: true, hasUsers });
}

async function handleRegister(req, res) {
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
}

async function handleLogin(req, res) {
  const body = await getBody(req);
  const email = (body.email || "").trim().toLowerCase();
  const password = (body.password || "").trim();
  if (!email || !password) {
    return sendError(res, "Email dan password wajib diisi.", 400);
  }

  const hashed = hashPassword(password);
  let result = await query("SELECT id, name, email, role, active FROM users WHERE email = $1 AND password = $2", [email, hashed]);
  let user = result.rows[0];
  if (!user) {
    // Legacy fallback for users created before password hashing was introduced.
    const legacy = await query("SELECT id, name, email, role, active FROM users WHERE email = $1 AND password = $2", [email, password]);
    user = legacy.rows[0];
    if (user && user.active) {
      await query("UPDATE users SET password = $1 WHERE id = $2", [hashed, user.id]);
    }
  }
  if (!user || !user.active) {
    return sendError(res, "Email atau password salah.", 401);
  }

  const token = createId("session");
  await query("INSERT INTO sessions (token, user_id) VALUES ($1, $2)", [token, user.id]);
  sendJson(res, { success: true, token, user });
}

async function handleValidate(req, res) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.split(" ")[1];
  if (!token) {
    return sendError(res, "Token tidak diberikan.", 401);
  }

  const result = await query(
    `SELECT u.id, u.name, u.email, u.role, u.active
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token = $1 AND u.active = true`,
    [token]
  );
  const user = result.rows[0];
  if (!user) {
    return sendError(res, "Token tidak valid atau sesi telah berakhir.", 401);
  }

  sendJson(res, { success: true, user });
}

module.exports = async (req, res) => {
  const path = parsePath(req);

  if (req.method === "GET" && path === "/api/auth/status") return handleStatus(req, res);
  if (req.method === "POST" && path === "/api/auth/register") return handleRegister(req, res);
  if (req.method === "POST" && path === "/api/auth/login") return handleLogin(req, res);
  if (req.method === "GET" && path === "/api/auth/validate") return handleValidate(req, res);

  res.statusCode = 404;
  res.end("Not found");
};
