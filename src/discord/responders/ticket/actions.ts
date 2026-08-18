import { createResponder } from "#base";
import { ResponderType } from "@constatic/base";
import { brBuilder, createContainer } from "@magicyan/discord";
import { MessageFlags, PermissionFlagsBits, time } from "discord.js";
import { getConfig } from "../../../services/ticket/config.service.js";
import {
  closeTicket,
  getTicket,
  getTicketMessages,
} from "../../../services/ticket/ticket.db.js";
import {
  buildTranscriptContainer,
  createTranscriptAttachment,
  deliverTranscript,
  buildTranscriptText,
} from "../../../utils/ticket/transcript.js";
import { sendFeedbackRequest } from "../../../utils/ticket/feedback-deliver.js";
import { endVoiceSession } from "../../../services/ticket/voice.db.js";

createResponder({
  customId: "ticket/close/:id",
  types: [ResponderType.Button],
  cache: "cached",
  async run(interaction, { id }) {
    if (!interaction.guildId) {
      await interaction.reply({
        content: "❌ Este comando só funciona em servidores",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    try {
      await interaction.deferUpdate();

      const ticket = getTicket(id);
      if (!ticket) {
        await interaction.followUp({
          content: "❌ Ticket não encontrado",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      if (interaction.channelId !== ticket.channel_id) {
        await interaction.followUp({
          content: "❌ Este botão não pertence a este canal de ticket",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const config = getConfig(interaction.guildId);
      const staffRoleId = config?.staff_role_id ?? null;
      const hasManageChannels =
        interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels) ??
        false;
      const hasStaffRole =
        !!staffRoleId &&
        interaction.inCachedGuild() &&
        interaction.member.roles.cache.has(staffRoleId);
      const isOwner = interaction.user.id === ticket.user_id;
      const canClose = hasManageChannels || hasStaffRole || isOwner;

      if (!canClose) {
        await interaction.followUp({
          content: "❌ Apenas staff ou dono do ticket pode fechar",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const messages = getTicketMessages(id);
      const closedAt = Date.now();

      const closed = closeTicket(id, interaction.user.id);
      if (!closed) {
        await interaction.followUp({
          content: "❌ Erro ao fechar ticket",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const closedTicket = { ...ticket, closed_at: closedAt, closed_by: interaction.user.id };

      await interaction.editReply({
        components: [
          createContainer(
            constants.colors.warning,
            brBuilder(
              "**Ticket Fechado**",
              `Ticket: \`#${ticket.ticket_number ?? ticket.ticket_id}\``,
              `Fechado por: <@${interaction.user.id}>`,
              `Horário: ${time(new Date(closedAt), "f")}`,
              "",
              "📄 Transcript enviado para o canal de logs e para a DM do autor.",
            ),
          ),
        ],
      });

      await deliverTranscript({
        client: interaction.client,
        ticket: closedTicket,
        messages,
        closedById: interaction.user.id,
        closedAt,
        transcriptChannelId: config?.transcript_channel_id,
      });

      await sendFeedbackRequest(interaction.client, closedTicket);

      const voiceSession = endVoiceSession(id);
      if (voiceSession) {
        try {
          const voiceCh = await interaction.client.channels.fetch(
            voiceSession.voice_channel_id,
          );
          if (voiceCh && "deletable" in voiceCh && voiceCh.deletable) {
            await voiceCh.delete();
          }
        } catch {
          /* canal já removido */
        }
      }

      setTimeout(async () => {
        try {
          if (
            interaction.channel &&
            "deletable" in interaction.channel &&
            interaction.channel.deletable
          ) {
            await interaction.channel.delete();
          }
        } catch (err) {
          console.error("[deleteTicketChannel]", err);
        }
      }, 5000);
    } catch (err: unknown) {
      const code = (err as { code?: number })?.code;
      if (code === 10062 || code === 40060) return;
      console.error("[ticket/close/:id]", err);
    }
  },
});

createResponder({
  customId: "ticket/transcript/:id",
  types: [ResponderType.Button],
  cache: "cached",
  async run(interaction, { id }) {
    if (!interaction.guildId) {
      await interaction.reply({
        content: "❌ Este comando só funciona em servidores",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const ticket = getTicket(id);
      if (!ticket) {
        await interaction.editReply({ content: "❌ Ticket não encontrado" });
        return;
      }

      if (interaction.channelId !== ticket.channel_id) {
        await interaction.editReply({
          content: "❌ Este botão não pertence a este canal de ticket",
        });
        return;
      }

      const config = getConfig(interaction.guildId);
      const staffRoleId = config?.staff_role_id ?? null;
      const hasManageChannels =
        interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels) ??
        false;
      const hasStaffRole =
        !!staffRoleId &&
        interaction.inCachedGuild() &&
        interaction.member.roles.cache.has(staffRoleId);
      const isOwner = interaction.user.id === ticket.user_id;
      const canGenerateTranscript =
        hasManageChannels || hasStaffRole || isOwner;

      if (!canGenerateTranscript) {
        await interaction.editReply({
          content: "❌ Apenas staff ou dono do ticket pode gerar transcript",
        });
        return;
      }

      const messages = getTicketMessages(id);
      if (messages.length === 0) {
        await interaction.editReply({
          content: "❌ Nenhuma mensagem para transcrever",
        });
        return;
      }

      const text = buildTranscriptText(ticket, messages);
      const { attachment } = createTranscriptAttachment(ticket, text);

      await interaction.editReply({
        components: [
          buildTranscriptContainer(ticket, attachment, {
            recipient: "dm",
            closedByUser: interaction.user,
          }),
        ],
        files: [attachment],
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
      });
    } catch (err: unknown) {
      const code = (err as { code?: number })?.code;
      if (code === 10062 || code === 40060) return;
      console.error("[ticket/transcript/:id]", err);
    }
  },
});
