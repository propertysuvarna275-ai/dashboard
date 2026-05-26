const { sendJson, query } = require("../_helpers");

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    res.statusCode = 405;
    res.end("Method Not Allowed");
    return;
  }
  const result = await query("SELECT count(*) AS count FROM users");
  const hasUsers = Number(result.rows[0].count) > 0;
  sendJson(res, { success: true, hasUsers });
};
