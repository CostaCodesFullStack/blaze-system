import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const dataDir = path.resolve("./data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

export const db = new Database(path.join(dataDir, "database.sqlite"));

db.prepare(`
    CREATE TABLE IF NOT EXISTS guild_configs (
        guild_id TEXT PRIMARY KEY,
        transcript_channel_id TEXT,
        staff_role_id TEXT,
        ticket_category_id TEXT
    )
`).run();
