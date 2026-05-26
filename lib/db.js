// 1. GANTI INI: Pakai library Neon, bukan pg biasa
const { Pool } = require("@neondatabase/serverless");

require("dotenv").config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is required.");
}

// 2. Tambahkan ssl: true (Wajib untuk Neon di Vercel)
const pool = new Pool({ 
  connectionString,
  ssl: true 
});

async function query(text, params) {
  return pool.query(text, params);
}

module.exports = { query, pool };