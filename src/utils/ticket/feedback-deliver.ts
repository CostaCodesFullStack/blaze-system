import { MessageFlags, type Client } from "discord.js";
import { getFeedback } from "../../services/ticket/feedback.db.js";
import type { TicketData } from "../../types/ticket.js";
import { buildFeedbackPanel } from "./feedback-panel.js";

export async function sendFeedbackRequest(
  client: Client,
  ticket: TicketData,
) {
  if (getFeedback(ticket.ticket_id)) return;

  try {
    const user = await client.users.fetch(ticket.user_id);
    await user.send({
      components: [
        buildFeedbackPanel(ticket.ticket_id, ticket.ticket_number),
      ],
      flags: MessageFlags.IsComponentsV2,
    });
  } catch (err) {
    console.error("[sendFeedbackRequest]", {
      userId: ticket.user_id,
      ticketId: ticket.ticket_id,
      error: err,
    });
  }
}
