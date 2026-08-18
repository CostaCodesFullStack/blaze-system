import { createResponder } from "#base";
import { ResponderType } from "@constatic/base";
import { MessageFlags, PermissionFlagsBits } from "discord.js";
import { getConfig } from "../../../services/ticket/config.service.js";
import { assumeTicket, getTicket } from "../../../services/ticket/ticket.db.js";
import { buildTicketAssumedMessage } from "../../../utils/ticket/ticket-panel.js";

createResponder({
  customId: "ticket/assume/:id",
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

      if (interaction.channelId !== ticket.channel_id) {
        await interaction.reply({ content: "❌ Botão inválido neste canal", flags: MessageFlags.Ephemeral });
        return;
      }

      const config = getConfig(interaction.guildId);
      const staffRoleId = config?.staff_role_id ?? null;
      const hasManageChannels =
        interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels) ?? false;
      const hasStaffRole =
        !!staffRoleId &&
        interaction.inCachedGuild() &&
        interaction.member.roles.cache.has(staffRoleId);

      if (!hasManageChannels && !hasStaffRole) {
        await interaction.reply({
          content: "❌ Apenas staff pode assumir tickets",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      assumeTicket(id, interaction.user.id);
      await interaction.deferUpdate();

      if (interaction.channel?.isSendable()) {
        await interaction.channel.send({
          components: [buildTicketAssumedMessage(interaction.user.id)],
          flags: MessageFlags.IsComponentsV2,
        });
      }
    } catch (err: unknown) {
      const code = (err as { code?: number })?.code;
      if (code === 10062 || code === 40060) return;
      console.error("[ticket/assume/:id]", err);
    }
  },
});
