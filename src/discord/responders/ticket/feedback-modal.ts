import { createResponder } from "#base";
import { ResponderType } from "@constatic/base";
import { MessageFlags } from "discord.js";
import { getFeedback, saveFeedback } from "../../../services/ticket/feedback.db.js";
import { getTicket } from "../../../services/ticket/ticket.db.js";
import { buildFeedbackThanksContainer } from "../../../utils/ticket/feedback-panel.js";

createResponder({
  customId: "ticket/feedback-comment/:ticketId/:rating",
  types: [ResponderType.Modal, ResponderType.ModalComponent],
  cache: "cached",
  async run(interaction, { ticketId, rating }) {
    const ratingNum = Number.parseInt(rating, 10);

    const ticket = getTicket(ticketId);
    if (!ticket || interaction.user.id !== ticket.user_id) {
      await interaction.reply({
        content: "❌ Não foi possível registrar o feedback",
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

    const comment = interaction.fields.getTextInputValue("comentario")?.trim();

    const saved = saveFeedback({
      ticket_id: ticketId,
      guild_id: ticket.guild_id,
      user_id: interaction.user.id,
      rating: ratingNum,
      comment: comment || undefined,
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

    await interaction.reply({
      components: [buildFeedbackThanksContainer(ratingNum, Boolean(comment))],
      flags: MessageFlags.IsComponentsV2,
    });
  },
});
