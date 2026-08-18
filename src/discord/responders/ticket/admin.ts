import { createResponder } from "#base";
import { ResponderType } from "@constatic/base";
import {
  MessageFlags,
  PermissionFlagsBits,
  type GuildMemberRoleManager,
} from "discord.js";
import { getConfig } from "../../../services/ticket/config.service.js";
import { getTicket } from "../../../services/ticket/ticket.db.js";
import {
  buildAdminPanel,
  buildTicketNotifyDm,
} from "../../../utils/ticket/ticket-panel.js";

function isStaff(
  interaction: {
    memberPermissions: { has: (flag: bigint) => boolean } | null;
    inCachedGuild: () => boolean;
    member: { roles: GuildMemberRoleManager };
  },
  staffRoleId: string | null,
): boolean {
  const hasManageChannels =
    interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels) ?? false;
  const hasStaffRole =
    !!staffRoleId &&
    interaction.inCachedGuild() &&
    interaction.member.roles.cache.has(staffRoleId);
  return hasManageChannels || hasStaffRole;
}

createResponder({
  customId: "ticket/admin/:id",
  types: [ResponderType.Button],
  cache: "cached",
  async run(interaction, { id }) {
    if (!interaction.guildId) {
      await interaction.reply({ content: "❌ Apenas em servidores", flags: MessageFlags.Ephemeral });
      return;
    }

    try {
      const ticket = getTicket(id);
      if (!ticket) {
        await interaction.reply({ content: "❌ Ticket não encontrado", flags: MessageFlags.Ephemeral });
        return;
      }

      const config = getConfig(interaction.guildId);
      if (!isStaff(interaction, config?.staff_role_id ?? null)) {
        await interaction.reply({
          content: "❌ Apenas staff pode acessar o painel admin",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      await interaction.reply({
        components: [buildAdminPanel(interaction.user.id, id)],
        flags: ["Ephemeral", "IsComponentsV2"],
      });
    } catch (err: unknown) {
      const code = (err as { code?: number })?.code;
      if (code === 10062 || code === 40060) return;
      console.error("[ticket/admin/:id]", err);
    }
  },
});

createResponder({
  customId: "ticket/addmember/:id",
  types: [ResponderType.UserSelect],
  cache: "cached",
  async run(interaction, { id }) {
    if (!interaction.guildId) {
      await interaction.reply({ content: "❌ Apenas em servidores", flags: MessageFlags.Ephemeral });
      return;
    }

    try {
      const ticket = getTicket(id);
      if (!ticket) {
        await interaction.reply({ content: "❌ Ticket não encontrado", flags: MessageFlags.Ephemeral });
        return;
      }

      const memberId = interaction.values[0];
      const channel = interaction.channel;

      if (channel && "permissionOverwrites" in channel) {
        await channel.permissionOverwrites.edit(memberId, {
          ViewChannel: true,
          SendMessages: true,
          ReadMessageHistory: true,
          AttachFiles: true,
          EmbedLinks: true,
        });

        await interaction.reply({
          content: `✅ Membro <@${memberId}> adicionado ao ticket.`,
          flags: MessageFlags.Ephemeral,
        });
      }
    } catch (err: unknown) {
      const code = (err as { code?: number })?.code;
      if (code === 10062 || code === 40060) return;
      console.error("[ticket/addmember/:id]", err);
    }
  },
});

createResponder({
  customId: "ticket/notify/:id",
  types: [ResponderType.Button],
  cache: "cached",
  async run(interaction, { id }) {
    if (!interaction.guildId) {
      await interaction.reply({
        content: "❌ Apenas em servidores",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    try {
      const ticket = getTicket(id);
      if (!ticket) {
        await interaction.reply({
          content: "❌ Ticket não encontrado",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      if (interaction.channelId !== ticket.channel_id) {
        await interaction.reply({
          content: "❌ Este botão não pertence a este canal",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const guildConfig = getConfig(interaction.guildId);
      if (!isStaff(interaction, guildConfig?.staff_role_id ?? null)) {
        await interaction.reply({
          content: "❌ Apenas staff pode notificar membros",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const author = await interaction.client.users.fetch(ticket.user_id);

      await author.send({
        components: [
          buildTicketNotifyDm(
            ticket.ticket_number,
            interaction.user.id,
            interaction.guildId,
            ticket.channel_id,
          ),
        ],
        flags: MessageFlags.IsComponentsV2,
      });

      await interaction.reply({
        content: `✅ <@${ticket.user_id}> foi notificado na DM.`,
        flags: MessageFlags.Ephemeral,
      });
    } catch (err: unknown) {
      const code = (err as { code?: number })?.code;
      if (code === 10062 || code === 40060) return;

      const discordCode = (err as { code?: number })?.code;
      if (discordCode === 50007) {
        await interaction.reply({
          content: "❌ Não foi possível enviar DM. O usuário pode ter as mensagens fechadas.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      console.error("[ticket/notify/:id]", err);
      try {
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({
            content: "❌ Erro ao notificar membro",
            flags: MessageFlags.Ephemeral,
          });
        }
      } catch {
        /* ignora */
      }
    }
  },
});

createResponder({
  customId: "ticket/removemember/:id",
  types: [ResponderType.UserSelect],
  cache: "cached",
  async run(interaction, { id }) {
    if (!interaction.guildId) {
      await interaction.reply({ content: "❌ Apenas em servidores", flags: MessageFlags.Ephemeral });
      return;
    }

    try {
      const ticket = getTicket(id);
      if (!ticket) {
        await interaction.reply({ content: "❌ Ticket não encontrado", flags: MessageFlags.Ephemeral });
        return;
      }

      const memberId = interaction.values[0];

      if (memberId === ticket.user_id) {
        await interaction.reply({
          content: "❌ Não é possível remover o dono do ticket",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const channel = interaction.channel;
      if (channel && "permissionOverwrites" in channel) {
        await channel.permissionOverwrites.delete(memberId);
        await interaction.reply({
          content: `✅ Membro <@${memberId}> removido do ticket.`,
          flags: MessageFlags.Ephemeral,
        });
      }
    } catch (err: unknown) {
      const code = (err as { code?: number })?.code;
      if (code === 10062 || code === 40060) return;
      console.error("[ticket/removemember/:id]", err);
    }
  },
});
