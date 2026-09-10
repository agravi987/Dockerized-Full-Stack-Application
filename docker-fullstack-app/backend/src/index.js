import express from "express";
import cors from "cors";
import { pool, initDb } from "./db.js";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// ---------- health endpoint (used by Docker health checks in Guide 08) ----
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

// ---------- real endpoints -------------------------------------------------
app.get("/api/messages", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, message, created_at FROM messages ORDER BY created_at DESC LIMIT 50",
    );
    res.json(result.rows);
  } catch (err) {
    console.error("GET /api/messages failed:", err.message);
    res.status(500).json({ error: "Database error" });
  }
});

app.post("/api/messages", async (req, res) => {
  const { name, message } = req.body;

  if (!name || !message) {
    return res.status(400).json({ error: "name and message are required" });
  }

  try {
    const result = await pool.query(
      "INSERT INTO messages (name, message) VALUES ($1, $2) RETURNING *",
      [name, message],
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("POST /api/messages failed:", err.message);
    res.status(500).json({ error: "Database error" });
  }
});

// ---------- startup: wait for DB, then listen ------------------------------
async function start() {
  try {
    await initDb(); // creates the table if it doesn't exist
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`✅ Backend listening on 0.0.0.0:${PORT}`);
    });
  } catch (err) {
    console.error("❌ Startup failed (is the database up?):", err.message);
    process.exit(1); // exit → container restarts (see Guide 07)
  }
}

start();
