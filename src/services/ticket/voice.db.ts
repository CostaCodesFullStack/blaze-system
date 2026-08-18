import type { VoiceSession } from "../../types/ticket.js";
import { db } from "./config.db.js";

db.prepare(
  `
  CREATE TABLE IF NOT EXISTS ticket_voice_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id TEXT NOT NULL,
    guild_id TEXT NOT NULL,
    voice_channel_id TEXT NOT NULL,
    started_by TEXT NOT NULL,
    started_at INTEGER NOT NULL,
    ended_at INTEGER,
    duration_seconds INTEGER,
    FOREIGN KEY (ticket_id) REFERENCES tickets(ticket_id)
  )
`,
).run();

db.prepare(
  `CREATE INDEX IF NOT EXISTS idx_voice_ticket ON ticket_voice_sessions(ticket_id)`,
).run();

export function createVoiceSession(
  data: Omit<VoiceSession, "id" | "ended_at" | "duration_seconds">,
): boolean {
  try {
    const active = getActiveVoiceSession(data.ticket_id);
    if (active) return false;

    db.prepare(
      `
      INSERT INTO ticket_voice_sessions (
        ticket_id, guild_id, voice_channel_id, started_by, started_at
      ) VALUES (?, ?, ?, ?, ?)
    `,
    ).run(
      data.ticket_id,
      data.guild_id,
      data.voice_channel_id,
      data.started_by,
      data.started_at,
    );
    return true;
  } catch (err) {
    console.error("[createVoiceSession]", err);
    return false;
  }
}

export function getActiveVoiceSession(
  ticketId: string,
): VoiceSession | undefined {
  try {
    return db
      .prepare(
        `
      SELECT * FROM ticket_voice_sessions
      WHERE ticket_id = ? AND ended_at IS NULL
      ORDER BY started_at DESC LIMIT 1
    `,
      )
      .get(ticketId) as VoiceSession | undefined;
  } catch (err) {
    console.error("[getActiveVoiceSession]", err);
    return undefined;
  }
}

export function getVoiceSessionByChannel(
  voiceChannelId: string,
): VoiceSession | undefined {
  try {
    return db
      .prepare(
        `
      SELECT * FROM ticket_voice_sessions
      WHERE voice_channel_id = ? AND ended_at IS NULL
    `,
      )
      .get(voiceChannelId) as VoiceSession | undefined;
  } catch (err) {
    console.error("[getVoiceSessionByChannel]", err);
    return undefined;
  }
}

export function endVoiceSession(ticketId: string): VoiceSession | undefined {
  try {
    const session = getActiveVoiceSession(ticketId);
    if (!session) return undefined;

    const endedAt = Date.now();
    const durationSeconds = Math.floor((endedAt - session.started_at) / 1000);

    db.prepare(
      `
      UPDATE ticket_voice_sessions
      SET ended_at = ?, duration_seconds = ?
      WHERE id = ?
    `,
    ).run(endedAt, durationSeconds, session.id);

    return { ...session, ended_at: endedAt, duration_seconds: durationSeconds };
  } catch (err) {
    console.error("[endVoiceSession]", err);
    return undefined;
  }
}
