import { createResponder } from "#base";
import { ResponderType } from "@constatic/base";
import {
  ActionRowBuilder,
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { getFeedback, saveFeedback } from "../../../services/ticket/feedback.db.js";
import { getTicket } from "../../../services/ticket/ticket.db.js";
import {
  buildFeedbackThanksContainer,
} from "../../../utils/ticket/feedback-panel.js";

const LOW_RATING_THRESHOLD = 3;

createResponder({
  customId: "ticket/feedback/:ticketId/:rating",
  types: [ResponderType.Button],
  cache: "cached",
  async run(interaction, { ticketId, rating }) {
    const ratingNum = Number.parseInt(rating, 10);
    if (Number.isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      await interaction.reply({
        content: "❌ Avaliação inválida",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const ticket = getTicket(ticketId);
    if (!ticket) {
      await interaction.reply({
        content: "❌ Ticket não encontrado",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (interaction.user.id !== ticket.user_id) {
      await interaction.reply({
        content: "❌ Apenas o autor do ticket pode avaliar",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (getFeedback(ticketId)) {
      await interaction.reply({
        content: "⚠️ Você já avaliou este ticket",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (ratingNum <= LOW_RATING_THRESHOLD) {
      await interaction.showModal(
        new ModalBuilder()
          .setCustomId(`ticket/feedback-comment/${ticketId}/${ratingNum}`)
          .setTitle("Comentário sobre o atendimento")
          .addComponents(
            new ActionRowBuilder<TextInputBuilder>().addComponents(
              new TextInputBuilder()
                .setCustomId("comentario")
                .setLabel("O que podemos melhorar?")
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder("Descreva sua experiência (opcional)")
                .setRequired(false)
                .setMaxLength(1000),
            ),
          ),
      );
      return;
    }

    const saved = saveFeedback({
      ticket_id: ticketId,
      guild_id: ticket.guild_id,
      user_id: interaction.user.id,
      rating: ratingNum,
      staff_id: ticket.assumed_by,
      created_at: Date.now(),
    });

    if (!saved) {
      await interaction.reply({
        content: "❌ Erro ao salvar avaliação",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.update({
      components: [buildFeedbackThanksContainer(ratingNum, false)],
      flags: MessageFlags.IsComponentsV2,
    });
  },
});
