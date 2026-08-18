import { randomUUID } from "crypto";
import {
  ChannelType,
  OverwriteType,
  PermissionFlagsBits,
  type Guild,
  type GuildMember,
  type OverwriteResolvable,
} from "discord.js";
import type { GuildConfig } from "../../services/ticket/config.service.js";

export function validateTicketConfig(config: GuildConfig | undefined): {
  valid: boolean;
  error?: string;
} {
  if (!config) {
    return {
      valid: false,
      error:
        "Configuração não encontrada. Use `/configurar-bot` para configurar.",
    };
  }

  if (!config.ticket_category_id) {
    return {
      valid: false,
      error: "Categoria de tickets não configurada.",
    };
  }

  if (!config.staff_role_id) {
    return {
      valid: false,
      error: "Cargo de staff não configurado.",
    };
  }

  return { valid: true };
}

export async function createTicketChannel(
  guild: Guild,
  user: GuildMember,
  categoryId: string,
  staffRoleId: string,
  ticketNumber: number,
): Promise<{ success: boolean; channelId?: string; error?: string }> {
  try {
    const channelName = `ticket-${ticketNumber}`;

    const category = guild.channels.cache.get(categoryId);
    if (!category) {
      return {
        success: false,
        error: "Categoria configurada não existe mais.",
      };
    }

    const botMember = guild.members.me;
    if (
      !botMember
        ?.permissionsIn(category)
        .has(PermissionFlagsBits.ManageChannels)
    ) {
      return {
        success: false,
        error: "Sem permissão para criar canais nesta categoria.",
      };
    }

    const channel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: categoryId,
      permissionOverwrites: buildTicketPermissions(
        user.id,
        staffRoleId,
        guild.id,
      ),
    });

    return {
      success: true,
      channelId: channel.id,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    console.error("[createTicketChannel]", err);

    return {
      success: false,
      error: message,
    };
  }
}

export function buildTicketPermissions(
  userId: string,
  staffRoleId: string,
  guildId: string,
): OverwriteResolvable[] {
  return [
    {
      id: guildId,
      type: OverwriteType.Role,
      deny: [PermissionFlagsBits.ViewChannel],
    },
    {
      id: userId,
      type: OverwriteType.Member,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.EmbedLinks,
      ],
    },
    {
      id: staffRoleId,
      type: OverwriteType.Role,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.EmbedLinks,
        PermissionFlagsBits.ManageMessages,
        PermissionFlagsBits.ManageChannels,
      ],
    },
  ];
}

export function generateTicketId(): string {
  return randomUUID();
}

export async function createTicketVoiceChannel(
  guild: Guild,
  ticketChannelId: string,
  ticketNumber: number,
  userId: string,
  staffRoleId: string,
): Promise<{ success: boolean; channelId?: string; error?: string }> {
  try {
    const textChannel = guild.channels.cache.get(ticketChannelId);
    const parentId = textChannel?.parentId ?? undefined;

    const basePermissions = buildTicketPermissions(userId, staffRoleId, guild.id);
    const voicePermissions = basePermissions.map((overwrite) => {
      if (!("allow" in overwrite) || !overwrite.allow) return overwrite;
      const allow = Array.isArray(overwrite.allow)
        ? [...overwrite.allow]
        : [overwrite.allow];
      return {
        ...overwrite,
        allow: [
          ...allow,
          PermissionFlagsBits.Connect,
          PermissionFlagsBits.Speak,
        ],
      };
    });

    const channel = await guild.channels.create({
      name: `call-${ticketNumber}`,
      type: ChannelType.GuildVoice,
      parent: parentId,
      permissionOverwrites: voicePermissions,
    });

    return { success: true, channelId: channel.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    console.error("[createTicketVoiceChannel]", err);
    return { success: false, error: message };
  }
}
