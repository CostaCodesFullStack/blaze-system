import type { TicketData } from "../../types/ticket.js";
import { db } from "./config.db.js";

db.prepare(
  `
  CREATE TABLE IF NOT EXISTS tickets (
    ticket_id TEXT PRIMARY KEY,
    guild_id TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    closed_at INTEGER,
    closed_by TEXT,
    reason TEXT,
    ticket_number INTEGER NOT NULL DEFAULT 0
  )
`,
).run();

const migrations = [
  `ALTER TABLE tickets ADD COLUMN ticket_number INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE tickets ADD COLUMN category TEXT`,
  `ALTER TABLE tickets ADD COLUMN assumed_by TEXT`,
  `ALTER TABLE tickets ADD COLUMN assumed_at INTEGER`,
  `ALTER TABLE tickets ADD COLUMN priority TEXT DEFAULT 'normal'`,
  `ALTER TABLE ticket_messages ADD COLUMN attachments TEXT`,
  `ALTER TABLE ticket_messages ADD COLUMN message_type TEXT DEFAULT 'text'`,
];

for (const sql of migrations) {
  try {
    db.prepare(sql).run();
  } catch {
    /* coluna ja existe */
  }
}

db.prepare(
  `
  CREATE TABLE IF NOT EXISTS guild_ticket_counters (
    guild_id TEXT PRIMARY KEY,
    counter  INTEGER NOT NULL DEFAULT 0
  )
`,
).run();

db.prepare(
  `
  CREATE INDEX IF NOT EXISTS idx_ticket_user_open
  ON tickets (guild_id, user_id, closed_at)
`,
).run();

db.prepare(
  `
  CREATE TABLE IF NOT EXISTS ticket_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    username TEXT NOT NULL,
    content TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    FOREIGN KEY (ticket_id) REFERENCES tickets(ticket_id) ON DELETE CASCADE
  )
`,
).run();

export function getNextTicketNumber(guildId: string): number {
  return db.transaction(() => {
    db.prepare(
      `
      INSERT INTO guild_ticket_counters (guild_id, counter) VALUES (?, 1)
      ON CONFLICT(guild_id) DO UPDATE SET counter = counter + 1
    `,
    ).run(guildId);

    const row = db
      .prepare(`SELECT counter FROM guild_ticket_counters WHERE guild_id = ?`)
      .get(guildId) as { counter: number };

    return row.counter;
  })();
}

export function createTicket(data: TicketData): boolean {
  try {
    const existing = db
      .prepare(
        `
      SELECT ticket_id FROM tickets
      WHERE guild_id = ? AND user_id = ? AND closed_at IS NULL
    `,
      )
      .get(data.guild_id, data.user_id);

    if (existing) return false;

    db.prepare(
      `
      INSERT INTO tickets (
        ticket_id,
        guild_id,
        channel_id,
        user_id,
        created_at,
        ticket_number,
        category,
        priority
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    ).run(
      data.ticket_id,
      data.guild_id,
      data.channel_id,
      data.user_id,
      data.created_at,
      data.ticket_number ?? 0,
      data.category ?? null,
      data.priority ?? "normal",
    );

    return true;
  } catch (err) {
    console.error("[createTicket]", err);
    return false;
  }
}

export function getTicket(ticketId: string): TicketData | undefined {
  try {
    return db
      .prepare("SELECT * FROM tickets WHERE ticket_id = ?")
      .get(ticketId) as TicketData | undefined;
  } catch (err) {
    console.error("[getTicket]", err);
    return undefined;
  }
}

export function getTicketByChannelId(
  channelId: string,
): TicketData | undefined {
  try {
    return db
      .prepare(
        "SELECT * FROM tickets WHERE channel_id = ? AND closed_at IS NULL",
      )
      .get(channelId) as TicketData | undefined;
  } catch (err) {
    console.error("[getTicketByChannelId]", err);
    return undefined;
  }
}

export function getUserOpenTicket(
  guildId: string,
  userId: string,
): TicketData | undefined {
  try {
    return db
      .prepare(
        `
      SELECT * FROM tickets
      WHERE guild_id = ? AND user_id = ? AND closed_at IS NULL
    `,
      )
      .get(guildId, userId) as TicketData | undefined;
  } catch (err) {
    console.error("[getUserOpenTicket]", err);
    return undefined;
  }
}

export function assumeTicket(ticketId: string, staffId: string): boolean {
  try {
    const result = db
      .prepare(
        `
      UPDATE tickets
      SET assumed_by = ?, assumed_at = ?
      WHERE ticket_id = ? AND closed_at IS NULL
    `,
      )
      .run(staffId, Date.now(), ticketId);

    return result.changes > 0;
  } catch (err) {
    console.error("[assumeTicket]", err);
    return false;
  }
}

export function closeTicket(
  ticketId: string,
  closedBy: string,
  reason?: string,
): boolean {
  try {
    const result = db
      .prepare(
        `
      UPDATE tickets
      SET closed_at = ?, closed_by = ?, reason = ?
      WHERE ticket_id = ? AND closed_at IS NULL
    `,
      )
      .run(Date.now(), closedBy, reason || null, ticketId);

    return result.changes > 0;
  } catch (err) {
    console.error("[closeTicket]", err);
    return false;
  }
}

export function addTicketMessage(
  ticketId: string,
  userId: string,
  username: string,
  content: string,
  options?: {
    attachments?: string[];
    messageType?: string;
  },
): boolean {
  try {
    if (content.length > 4000) return false;

    db.prepare(
      `
      INSERT INTO ticket_messages (
        ticket_id,
        user_id,
        username,
        content,
        timestamp,
        attachments,
        message_type
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    ).run(
      ticketId,
      userId,
      username,
      content,
      Date.now(),
      options?.attachments?.length
        ? JSON.stringify(options.attachments)
        : null,
      options?.messageType ?? "text",
    );

    return true;
  } catch (err) {
    console.error("[addTicketMessage]", err);
    return false;
  }
}

export interface TicketMessage {
  user_id: string;
  username: string;
  content: string;
  timestamp: number;
  attachments?: string | null;
  message_type?: string | null;
}

export function getTicketMessages(ticketId: string): TicketMessage[] {
  try {
    return db
      .prepare(
        `
      SELECT user_id, username, content, timestamp, attachments, message_type
      FROM ticket_messages
      WHERE ticket_id = ?
      ORDER BY timestamp ASC
    `,
      )
      .all(ticketId) as TicketMessage[];
  } catch (err) {
    console.error("[getTicketMessages]", err);
    return [];
  }
}

const TICKET_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const TICKET_RATE_LIMIT_MAX = 3;

export function countRecentTicketsByUser(
  guildId: string,
  userId: string,
  windowMs = TICKET_RATE_LIMIT_WINDOW_MS,
): number {
  try {
    const row = db
      .prepare(
        `
      SELECT COUNT(*) as count FROM tickets
      WHERE guild_id = ? AND user_id = ? AND created_at > ?
    `,
      )
      .get(guildId, userId, Date.now() - windowMs) as { count: number };
    return row.count;
  } catch (err) {
    console.error("[countRecentTicketsByUser]", err);
    return 0;
  }
}

export function isTicketRateLimited(guildId: string, userId: string): boolean {
  return countRecentTicketsByUser(guildId, userId) >= TICKET_RATE_LIMIT_MAX;
}

export function getGuildTicketStats(guildId: string) {
  try {
    const totals = db
      .prepare(
        `
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN closed_at IS NULL THEN 1 ELSE 0 END) as open,
        SUM(CASE WHEN closed_at IS NOT NULL THEN 1 ELSE 0 END) as closed,
        AVG(CASE WHEN closed_at IS NOT NULL THEN closed_at - created_at END) as avg_duration
      FROM tickets WHERE guild_id = ?
    `,
      )
      .get(guildId) as {
      total: number;
      open: number;
      closed: number;
      avg_duration: number | null;
    };

    const categories = db
      .prepare(
        `
      SELECT category, COUNT(*) as count FROM tickets
      WHERE guild_id = ? AND category IS NOT NULL
      GROUP BY category
    `,
      )
      .all(guildId) as Array<{ category: string; count: number }>;

    const byCategory: Record<string, number> = {};
    for (const row of categories) {
      byCategory[row.category] = row.count;
    }

    return {
      total: totals.total,
      open: totals.open,
      closed: totals.closed,
      avgDurationMs: totals.avg_duration ?? 0,
      byCategory,
    };
  } catch (err) {
    console.error("[getGuildTicketStats]", err);
    return {
      total: 0,
      open: 0,
      closed: 0,
      avgDurationMs: 0,
      byCategory: {} as Record<string, number>,
    };
  }
}
