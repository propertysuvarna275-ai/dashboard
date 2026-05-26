const { sendJson, sendError, getBody, createId, query, hashPassword } = require("../_helpers");

module.exports = async (req, res) => {
  // Cek metode request harus POST
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

    // Hash password yang dimasukkan user untuk dibandingkan
    // (Tidak pakai await karena crypto.createHash di _helpers.js milikmu adalah synchronous)
    const hashed = hashPassword(password); 
    
    // Ambil user dari database Neon berdasarkan email
    let result = await query("SELECT id, name, email, role, active, password FROM users WHERE email = $1", [email]);
    let user = result.rows[0];

    // Jika user tidak ditemukan
    if (!user) {
      return sendError(res, "Email atau password salah.", 401);
    }

    // Logika pengecekan password
    let isMatch = false;
    let isLegacy = false;

    if (user.password === hashed) {
        isMatch = true; // Password hash SHA256 cocok
    } else if (user.password === password) {
        isMatch = true; // Password plain text (legacy) cocok
        isLegacy = true;
    }

    // Jika password tidak cocok ATAU akun tidak aktif
    if (!isMatch || !user.active) {
      return sendError(res, "Email atau password salah.", 401);
    }

    // Jika password masih plain text (legacy), upgrade ke SHA256 hash di database
    if (isLegacy) {
      await query("UPDATE users SET password = $1 WHERE id = $2", [hashed, user.id]);
    }

    // Buat session token dan simpan ke tabel sessions
    const token = createId("session");
    await query("INSERT INTO sessions (token, user_id) VALUES ($1, $2)", [token, user.id]);

    // Hapus password dari response agar aman (tidak terkirim ke frontend)
    delete user.password; 

    // Kirim respons sukses ke frontend
    sendJson(res, { success: true, token, user });

  } catch (error) {
    // Tangani error tak terduga (misal: database Neon down)
    console.error("Login Error:", error);
    return sendError(res, "Terjadi kesalahan di server.", 500);
  }
};