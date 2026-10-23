const express = require("express");
const path = require("path");
const fs = require("fs/promises");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

async function ensureDatabase() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(USERS_FILE);
  } catch {
    await fs.writeFile(USERS_FILE, "[]", "utf8");
  }
}
async function readUsers() {
  await ensureDatabase();
  return JSON.parse(await fs.readFile(USERS_FILE, "utf8"));
}
async function writeUsers(users) {
  await ensureDatabase();
  const tempFile = `${USERS_FILE}.tmp`;
  await fs.writeFile(tempFile, JSON.stringify(users, null, 2), "utf8");
  await fs.rename(tempFile, USERS_FILE);
}
function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email };
}

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", app: "FlowLock Express API" });
});

app.post("/api/auth/register", async (req, res, next) => {
  try {
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Enter a name and a valid email address." });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters." });
    }
    const users = await readUsers();
    if (users.some((u) => u.email.toLowerCase() === email)) {
      return res.status(409).json({ error: "An account with this email already exists." });
    }
    const user = {
      id: `usr_${crypto.randomUUID()}`,
      name,
      email,
      passwordHash: await bcrypt.hash(password, 12),
      createdAt: new Date().toISOString()
    };
    users.push(user);
    await writeUsers(users);
    res.status(201).json({ user: publicUser(user) });
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/login", async (req, res, next) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    const users = await readUsers();
    const user = users.find((u) => u.email.toLowerCase() === email);
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: "Invalid email or password." });
    }
    res.json({ user: publicUser(user) });
  } catch (error) {
    next(error);
  }
});

app.use(express.static(path.join(__dirname)));

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "An unexpected server error occurred." });
});

ensureDatabase().then(() => {
  app.listen(PORT, () => console.log(`FlowLock running at http://localhost:${PORT}`));
}).catch((error) => {
  console.error("Could not initialize user storage:", error);
  process.exit(1);
});
