import { createResponder } from "#base";
import { ResponderType } from "@constatic/base";
import {
  ActionRowBuilder,
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { getUserOpenTicket } from "../../../services/ticket/ticket.db.js";
import { buildTicketPanel } from "../../../utils/ticket/ticket-panel.js";

createResponder({
  customId: "ticket:create",
  types: [ResponderType.StringSelect],
  cache: "cached",
  async run(interaction) {
    if (!interaction.guildId || !interaction.member) {
      await interaction.reply({
        content: "❌ Este comando só funciona em servidores",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    try {
      const existingTicket = getUserOpenTicket(
        interaction.guildId,
        interaction.user.id,
      );

      if (existingTicket) {
        await interaction.reply({
          content: `⚠️ Você já possui um ticket aberto: <#${existingTicket.channel_id}>`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const category = interaction.values[0];

      await interaction.showModal(
        new ModalBuilder()
          .setCustomId(`ticket/modal/${category}`)
          .setTitle("🎫 Abrir Ticket de Suporte")
          .addComponents(
            new ActionRowBuilder<TextInputBuilder>().addComponents(
              new TextInputBuilder()
                .setCustomId("assunto")
                .setLabel("Assunto do Ticket")
                .setStyle(TextInputStyle.Short)
                .setPlaceholder("Descreva brevemente o assunto do ticket...")
                .setRequired(true)
                .setMaxLength(1000),
            ),
          ),
      );

      setTimeout(() => {
        const message = interaction.message;
        if (!message) return;

        message
          .edit({ components: [buildTicketPanel()] })
          .catch((err: { code?: number }) => {
            if (err?.code === 10008 || err?.code === 10062 || err?.code === 40060)
              return;
            console.error("[ticket:create] falha ao resetar painel", err);
          });
      }, 2000);
    } catch (err: unknown) {
      const code = (err as { code?: number })?.code;
      if (code === 10062 || code === 40060) return;
      console.error("[ticket:create]", err);
      try {
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({
            content: "❌ Erro ao abrir formulário",
            flags: MessageFlags.Ephemeral,
          });
        }
      } catch {
        /* ignora */
      }
    }
  },
});
