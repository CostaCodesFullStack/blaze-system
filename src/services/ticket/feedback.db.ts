import type { TicketFeedback } from "../../types/ticket.js";
import { db } from "./config.db.js";

db.prepare(
  `
  CREATE TABLE IF NOT EXISTS ticket_feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id TEXT NOT NULL UNIQUE,
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
    comment TEXT,
    staff_id TEXT,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (ticket_id) REFERENCES tickets(ticket_id)
  )
`,
).run();

db.prepare(
  `CREATE INDEX IF NOT EXISTS idx_feedback_guild ON ticket_feedback(guild_id)`,
).run();
db.prepare(
  `CREATE INDEX IF NOT EXISTS idx_feedback_staff ON ticket_feedback(staff_id)`,
).run();

export function saveFeedback(data: Omit<TicketFeedback, "id">): boolean {
  try {
    db.prepare(
      `
      INSERT INTO ticket_feedback (
        ticket_id, guild_id, user_id, rating, comment, staff_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    ).run(
      data.ticket_id,
      data.guild_id,
      data.user_id,
      data.rating,
      data.comment ?? null,
      data.staff_id ?? null,
      data.created_at,
    );
    return true;
  } catch (err) {
    console.error("[saveFeedback]", err);
    return false;
  }
}

export function getFeedback(ticketId: string): TicketFeedback | undefined {
  try {
    return db
      .prepare("SELECT * FROM ticket_feedback WHERE ticket_id = ?")
      .get(ticketId) as TicketFeedback | undefined;
  } catch (err) {
    console.error("[getFeedback]", err);
    return undefined;
  }
}

export function getStaffAverageRating(
  staffId: string,
  guildId: string,
): number | null {
  try {
    const row = db
      .prepare(
        `
      SELECT AVG(rating) as avg FROM ticket_feedback
      WHERE staff_id = ? AND guild_id = ?
    `,
      )
      .get(staffId, guildId) as { avg: number | null } | undefined;
    return row?.avg ?? null;
  } catch (err) {
    console.error("[getStaffAverageRating]", err);
    return null;
  }
}

export function getGuildFeedbackStats(guildId: string) {
  try {
    const row = db
      .prepare(
        `
      SELECT COUNT(*) as count, AVG(rating) as avg
      FROM ticket_feedback WHERE guild_id = ?
    `,
      )
      .get(guildId) as { count: number; avg: number | null };
    return { count: row.count, avg: row.avg ?? 0 };
  } catch (err) {
    console.error("[getGuildFeedbackStats]", err);
    return { count: 0, avg: 0 };
  }
}

export function getTopStaffByRating(guildId: string, limit = 5) {
  try {
    return db
      .prepare(
        `
      SELECT staff_id, AVG(rating) as avg_rating, COUNT(*) as count
      FROM ticket_feedback
      WHERE guild_id = ? AND staff_id IS NOT NULL
      GROUP BY staff_id
      ORDER BY avg_rating DESC, count DESC
      LIMIT ?
    `,
      )
      .all(guildId, limit) as Array<{
      staff_id: string;
      avg_rating: number;
      count: number;
    }>;
  } catch (err) {
    console.error("[getTopStaffByRating]", err);
    return [];
  }
}
