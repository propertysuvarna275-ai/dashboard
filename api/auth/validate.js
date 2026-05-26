const { sendJson, sendError, query } = require("../_helpers");

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    res.statusCode = 405;
    res.end("Method Not Allowed");
    return;
  }

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
};
