import { createEvent } from "#base";
import { ChannelType } from "discord.js";
import {
  addTicketMessage,
  getTicketByChannelId,
} from "../../services/ticket/ticket.db.js";
import type { TicketMessageType } from "../../types/ticket.js";

function resolveMessageContent(message: import("discord.js").Message) {
  const attachmentUrls = [...message.attachments.values()].map((a) => a.url);
  let content = message.content?.trim() ?? "";
  let messageType: TicketMessageType = "text";

  if (message.stickers.size > 0) {
    messageType = "sticker";
    const names = [...message.stickers.values()].map((s) => s.name).join(", ");
    content = content || `[Sticker: ${names}]`;
  } else if (attachmentUrls.length > 0) {
    const hasImage = [...message.attachments.values()].some((a) =>
      a.contentType?.startsWith("image/"),
    );
    messageType = hasImage ? "image" : "file";
    if (!content) content = `[${messageType === "image" ? "Imagem" : "Arquivo"}]`;
  } else if (message.embeds.length > 0) {
    messageType = "embed";
    if (!content) {
      const embed = message.embeds[0];
      content = `[Embed: ${embed.title ?? embed.description ?? "conteúdo embutido"}]`;
    }
  }

  if (!content) content = "[mensagem vazia]";

  return { content, attachmentUrls, messageType };
}

createEvent({
  name: "ticket-capture",
  event: "messageCreate",
  async run(message) {
    if (message.author.bot || !message.guildId) return;

    try {
      if (message.channel.type !== ChannelType.GuildText) return;
      if (!message.channel.name?.startsWith("ticket-")) return;

      const ticket = getTicketByChannelId(message.channelId);
      if (!ticket) return;

      const { content, attachmentUrls, messageType } = resolveMessageContent(message);

      addTicketMessage(
        ticket.ticket_id,
        message.author.id,
        message.author.username,
        content,
        {
          attachments: attachmentUrls.length ? attachmentUrls : undefined,
          messageType,
        },
      );
    } catch (err) {
      console.error("[ticket-capture]", err);
    }
  },
});
