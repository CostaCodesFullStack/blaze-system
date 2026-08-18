import { db } from "./config.db.js";

export interface GuildConfig {
  guild_id: string;
  transcript_channel_id: string | null;
  staff_role_id: string | null;
  ticket_category_id: string | null;
}

export interface ConfigResult {
  success: boolean;
  error?: string;
}

type CacheEntry = {
  data: GuildConfig;
  expiresAt: number;
};

const configCache = new Map<string, CacheEntry>();
const CACHE_TTL = 1000 * 60 * 60;

function getCacheKey(guildId: string) {
  return `guild_config:${guildId}`;
}

export function getConfig(guildId: string): GuildConfig | undefined {
  const key = getCacheKey(guildId);
  const cached = configCache.get(key);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  try {
    const config = db
      .prepare(`SELECT * FROM guild_configs WHERE guild_id = ?`)
      .get(guildId) as GuildConfig | undefined;

    if (config) {
      configCache.set(key, {
        data: config,
        expiresAt: Date.now() + CACHE_TTL,
      });
    }

    return config;
  } catch (err) {
    console.error("[getConfig]", err);
    return undefined;
  }
}

function ensureGuildRow(guildId: string) {
  db.prepare(
    `
    INSERT OR IGNORE INTO guild_configs (guild_id)
    VALUES (?)
  `,
  ).run(guildId);
}

function normalizeConfigId(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;

  const trimmed = value.trim();
  if (!trimmed) return undefined;

  if (!/^\d{16,22}$/.test(trimmed)) return undefined;

  return trimmed;
}

export function setConfig(
  guildId: string,
  data: Partial<{
    transcript_channel_id: string;
    staff_role_id: string;
    ticket_category_id: string;
  }>,
): ConfigResult {
  try {
    ensureGuildRow(guildId);

    const updates: Array<{ field: string; value: unknown }> = [];

    const transcriptChannelId = normalizeConfigId(data.transcript_channel_id);
    if (data.transcript_channel_id !== undefined) {
      if (!transcriptChannelId) {
        return {
          success: false,
          error: "transcript_channel_id invalido",
        };
      }
      updates.push({
        field: "transcript_channel_id",
        value: transcriptChannelId,
      });
    }

    const staffRoleId = normalizeConfigId(data.staff_role_id);
    if (data.staff_role_id !== undefined) {
      if (!staffRoleId) {
        return {
          success: false,
          error: "staff_role_id invalido",
        };
      }
      updates.push({ field: "staff_role_id", value: staffRoleId });
    }

    const ticketCategoryId = normalizeConfigId(data.ticket_category_id);
    if (data.ticket_category_id !== undefined) {
      if (!ticketCategoryId) {
        return {
          success: false,
          error: "ticket_category_id invalido",
        };
      }
      updates.push({ field: "ticket_category_id", value: ticketCategoryId });
    }

    if (updates.length === 0) {
      return {
        success: false,
        error: "Nenhum campo valido para atualizar",
      };
    }

    const updateClauses = updates.map((u) => `${u.field} = ?`).join(", ");
    const query = `UPDATE guild_configs SET ${updateClauses} WHERE guild_id = ?`;

    db.prepare(query).run(...updates.map((u) => u.value), guildId);

    invalidateConfigCache(guildId);

    return { success: true };
  } catch (err) {
    console.error("[setConfig]", err);

    return {
      success: false,
      error: err instanceof Error ? err.message : "Erro desconhecido",
    };
  }
}

export function invalidateConfigCache(guildId: string) {
  configCache.delete(getCacheKey(guildId));
}
