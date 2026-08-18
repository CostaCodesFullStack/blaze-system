import { createResponder } from "#base";
import { ResponderType } from "@constatic/base";
import { createContainer, createRow } from "@magicyan/discord";
import {
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  PermissionFlagsBits,
} from "discord.js";
import { getConfig } from "../../../services/ticket/config.service.js";
import { getTicket } from "../../../services/ticket/ticket.db.js";
import {
  createVoiceSession,
  endVoiceSession,
  getActiveVoiceSession,
} from "../../../services/ticket/voice.db.js";
import { createTicketVoiceChannel } from "../../../utils/ticket/ticket-helpers.js";
import { config } from "../../config/config.js";

function isStaff(
  interaction: {
    memberPermissions: { has: (flag: bigint) => boolean } | null;
    inCachedGuild: () => boolean;
    member: { roles: { cache: { has: (id: string) => boolean } } };
  },
  staffRoleId: string | null,
) {
  const hasManageChannels =
    interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels) ?? false;
  const hasStaffRole =
    !!staffRoleId &&
    interaction.inCachedGuild() &&
    interaction.member.roles.cache.has(staffRoleId);
  return hasManageChannels || hasStaffRole;
}

createResponder({
  customId: "ticket/voice/start/:id",
  types: [ResponderType.Button],
  cache: "cached",
  async run(interaction, { id }) {
    if (!interaction.guildId || !interaction.guild) {
      await interaction.reply({
        content: "❌ Apenas em servidores",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const ticket = getTicket(id);
    if (!ticket || interaction.channelId !== ticket.channel_id) {
      await interaction.reply({
        content: "❌ Ticket inválido",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const guildConfig = getConfig(interaction.guildId);
    if (!isStaff(interaction, guildConfig?.staff_role_id ?? null)) {
      await interaction.reply({
        content: "❌ Apenas staff pode iniciar chamadas",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const active = getActiveVoiceSession(id);
    if (active) {
      await interaction.reply({
        content: `⚠️ Já existe uma chamada ativa: <#${active.voice_channel_id}>`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const result = await createTicketVoiceChannel(
      interaction.guild,
      ticket.channel_id,
      ticket.ticket_number ?? 0,
      ticket.user_id,
      guildConfig!.staff_role_id!,
    );

    if (!result.success || !result.channelId) {
      await interaction.reply({
        content: `❌ ${result.error ?? "Erro ao criar canal de voz"}`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const saved = createVoiceSession({
      ticket_id: id,
      guild_id: interaction.guildId,
      voice_channel_id: result.channelId,
      started_by: interaction.user.id,
      started_at: Date.now(),
    });

    if (!saved) {
      const ch = await interaction.client.channels.fetch(result.channelId);
      if (ch && "deletable" in ch && ch.deletable) await ch.delete();
      await interaction.reply({
        content: "❌ Erro ao registrar sessão de voz",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.reply({
      content: `✅ Canal de voz criado: <#${result.channelId}>`,
      flags: MessageFlags.Ephemeral,
    });

    if (interaction.channel?.isSendable()) {
      await interaction.channel.send({
        components: [
          createContainer(
            constants.colors.primary,
            "### 🎙️ Chamada de suporte iniciada",
            `O staff <@${interaction.user.id}> abriu uma chamada de voz.`,
            "Clique no botão abaixo para entrar.",
            createRow(
              new ButtonBuilder({
                label: "Entrar na chamada",
                style: ButtonStyle.Link,
                url: `https://discord.com/channels/${interaction.guildId}/${result.channelId}`,
              }),
            ),
            config.footer,
          ),
        ],
        flags: MessageFlags.IsComponentsV2,
      });
    }
  },
});

createResponder({
  customId: "ticket/voice/end/:id",
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

    const ticket = getTicket(id);
    if (!ticket) {
      await interaction.reply({
        content: "❌ Ticket não encontrado",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const guildConfig = getConfig(interaction.guildId);
    if (!isStaff(interaction, guildConfig?.staff_role_id ?? null)) {
      await interaction.reply({
        content: "❌ Apenas staff pode encerrar chamadas",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const session = endVoiceSession(id);
    if (!session) {
      await interaction.reply({
        content: "❌ Nenhuma chamada ativa para este ticket",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    try {
      const voiceChannel = await interaction.client.channels.fetch(
        session.voice_channel_id,
      );
      if (voiceChannel && "deletable" in voiceChannel && voiceChannel.deletable) {
        await voiceChannel.delete();
      }
    } catch (err) {
      console.error("[ticket/voice/end] delete channel", err);
    }

    const minutes = Math.floor((session.duration_seconds ?? 0) / 60);
    const seconds = (session.duration_seconds ?? 0) % 60;

    await interaction.reply({
      content: `✅ Chamada encerrada (duração: ${minutes}min ${seconds}s)`,
      flags: MessageFlags.Ephemeral,
    });

    if (interaction.channel?.isSendable()) {
      await interaction.channel.send({
        components: [
          createContainer(
            constants.colors.warning,
            "### 🔇 Chamada encerrada",
            `Encerrada por <@${interaction.user.id}>.`,
            `Duração: **${minutes}min ${seconds}s**`,
            config.footer,
          ),
        ],
        flags: MessageFlags.IsComponentsV2,
      });
    }
  },
});
