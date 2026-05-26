const { query } = require("../lib/db");
const crypto = require("crypto");

function hashPassword(password) {
  return crypto.createHash("sha256").update(String(password)).digest("hex");
}

function sendJson(res, payload, status = 200) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

function sendError(res, message, status = 400) {
  return sendJson(res, { success: false, error: message }, status);
}

function parsePath(req) {
  return new URL(req.url, `http://${req.headers.host || "localhost"}`).pathname;
}

async function getBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });
    req.on("end", () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

function createId(prefix) {
  return `${prefix}-${Date.now()}-${crypto.randomBytes(6).toString("hex")}`;
}

function getToken(req) {
  const header = req.headers.authorization || "";
  const parts = header.split(" ");
  if (parts.length === 2 && parts[0] === "Bearer") return parts[1];
  return null;
}

async function getUserFromToken(req) {
  const token = getToken(req);
  if (!token) return null;
  const result = await query(
    `SELECT u.id, u.name, u.email, u.role, u.active
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token = $1 AND u.active = true`,
    [token]
  );
  return result.rows[0] || null;
}

async function requireAuth(req, res) {
  const user = await getUserFromToken(req);
  if (!user) {
    sendError(res, "Authentication required.", 401);
    return null;
  }
  return user;
}

async function requireAdmin(req, res) {
  const user = await requireAuth(req, res);
  if (!user) return null;
  if (user.role !== "Admin") {
    sendError(res, "Admin access required.", 403);
    return null;
  }
  return user;
}

module.exports = {
  sendJson,
  sendError,
  getBody,
  createId,
  parsePath,
  getToken,
  getUserFromToken,
  requireAuth,
  requireAdmin,
  query,
  hashPassword,
};
