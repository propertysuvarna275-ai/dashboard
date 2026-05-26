const { sendJson, sendError, getBody, createId, query, hashPassword } = require("../_helpers");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.end("Method Not Allowed");
    return;
  }

  try {
    const body = await getBody(req);
    const email = (body.email || "").trim().toLowerCase();
    const password = (body.password || "").trim();
    
    if (!email || !password) {
      return sendError(res, "Email dan password wajib diisi.", 400);
    }

    // FIX 1: Tambahkan await di sini!
    const hashed = await hashPassword(password); 
    
    let result = await query("SELECT id, name, email, role, active, password FROM users WHERE email = $1", [email]);
    let user = result.rows[0];

    // Logika pengecekan password (Lebih aman dilakukan di Node.js daripada di query SQL)
    let isMatch = false;
    let isLegacy = false;

    if (user) {
        if (user.password === hashed) {
            isMatch = true; // Password hash cocok
        } else if (user.password === password) {
            isMatch = true; // Password legacy (plain text) cocok
            isLegacy = true;
        }
    }

    if (!isMatch || !user || !user.active) {
      return sendError(res, "Email atau password salah.", 401);
    }

    // Jika password legacy, upgrade ke bcrypt hash
    if (isLegacy) {
      await query("UPDATE users SET password = $1 WHERE id = $2", [hashed, user.id]);
    }

    // Buat session token
    const token = createId("session");
    await query("INSERT INTO sessions (token, user_id) VALUES ($1, $2)", [token, user.id]);

    // Hapus password dari response agar aman
    delete user.password; 

    sendJson(res, { success: true, token, user });

  } catch (error) {
    console.error("Login Error:", error);
    return sendError(res, "Terjadi kesalahan di server.", 500);
  }
};