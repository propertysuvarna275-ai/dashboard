const { sendJson, sendError, getBody, createId, parsePath, requireAdmin, query, hashPassword } = require("./_helpers");

async function handleList(req, res) {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const result = await query(
    `SELECT id, name, email, role, active, created_at FROM users ORDER BY created_at DESC`
  );
  sendJson(res, { success: true, users: result.rows });
}

async function handleCreate(req, res) {
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
  sendJson(res, { success: true, user: result.rows[0] });
}

async function handleUpdate(req, res, targetId) {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const body = await getBody(req);
  const result = await query("SELECT id, role, active FROM users WHERE id = $1", [targetId]);
  const user = result.rows[0];
  if (!user) return sendError(res, "User tidak ditemukan.", 404);

  if (user.role === "Admin" && user.active && body.active === false) {
    const admins = await query("SELECT count(*) AS count FROM users WHERE role = 'Admin' AND active = true");
    if (Number(admins.rows[0].count) <= 1) {
      return sendError(res, "Tidak bisa menonaktifkan admin terakhir.", 400);
    }
  }

  const updates = [];
  const values = [];
  let index = 1;
  ["name", "email", "password", "role", "active"].forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      updates.push(`${field} = $${index}`);
      if (field === "active") {
        values.push(body.active === true || body.active === "true");
      } else if (field === "password") {
        values.push(hashPassword(body.password));
      } else {
        values.push(body[field]);
      }
      index += 1;
    }
  });
  if (updates.length === 0) return sendError(res, "Tidak ada perubahan yang dikirim.", 400);
  values.push(targetId);
  await query(`UPDATE users SET ${updates.join(", ")} WHERE id = $${index}`, values);
  const updated = await query("SELECT id, name, email, role, active, created_at FROM users WHERE id = $1", [targetId]);
  sendJson(res, { success: true, user: updated.rows[0] });
}

async function handleDelete(req, res, targetId) {
  const auth = await requireAdmin(req, res);
  if (!auth) return;
  const result = await query("SELECT id, role, active FROM users WHERE id = $1", [targetId]);
  const user = result.rows[0];
  if (!user) return sendError(res, "User tidak ditemukan.", 404);
  if (user.role === "Admin") {
    const admins = await query("SELECT count(*) AS count FROM users WHERE role = 'Admin' AND active = true");
    if (Number(admins.rows[0].count) <= 1) {
      return sendError(res, "Tidak bisa menghapus admin terakhir.", 400);
    }
  }
  await query("DELETE FROM users WHERE id = $1", [targetId]);
  sendJson(res, { success: true });
}

module.exports = async (req, res) => {
  const path = parsePath(req);
  const parts = path.split("/").filter(Boolean);
  const targetId = parts.length === 3 ? parts[2] : null;

  if (req.method === "GET" && path === "/api/users") return handleList(req, res);
  if (req.method === "POST" && path === "/api/users") return handleCreate(req, res);
  if (targetId && req.method === "PATCH") return handleUpdate(req, res, targetId);
  if (targetId && req.method === "DELETE") return handleDelete(req, res, targetId);

  res.statusCode = 404;
  res.end("Not found");
};
