const { sendJson, sendError, getBody, requireAdmin, query, hashPassword } = require("../../api/_helpers");

module.exports = async (req, res) => {
  const id = req.url.split("/").pop();
  if (!id) {
    res.statusCode = 404;
    res.end("Not found");
    return;
  }

  if (req.method === "PATCH") {
    const auth = await requireAdmin(req, res);
    if (!auth) return;
    const body = await getBody(req);
    const result = await query("SELECT id, role, active FROM users WHERE id = $1", [id]);
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
    values.push(id);
    await query(`UPDATE users SET ${updates.join(", ")} WHERE id = $${index}`, values);
    const updated = await query("SELECT id, name, email, role, active, created_at FROM users WHERE id = $1", [id]);
    return sendJson(res, { success: true, user: updated.rows[0] });
  }

  if (req.method === "DELETE") {
    const auth = await requireAdmin(req, res);
    if (!auth) return;
    const result = await query("SELECT id, role, active FROM users WHERE id = $1", [id]);
    const user = result.rows[0];
    if (!user) return sendError(res, "User tidak ditemukan.", 404);
    if (user.role === "Admin") {
      const admins = await query("SELECT count(*) AS count FROM users WHERE role = 'Admin' AND active = true");
      if (Number(admins.rows[0].count) <= 1) {
        return sendError(res, "Tidak bisa menghapus admin terakhir.", 400);
      }
    }
    await query("DELETE FROM users WHERE id = $1", [id]);
    return sendJson(res, { success: true });
  }

  res.statusCode = 405;
  res.end("Method Not Allowed");
};
