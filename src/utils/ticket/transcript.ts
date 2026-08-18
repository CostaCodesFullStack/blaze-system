import { icon } from "#functions";
import {
  brBuilder,
  createContainer,
  createFile,
  createSeparator,
} from "@magicyan/discord";
import {
  AttachmentBuilder,
  MessageFlags,
  type Client,
  type User,
} from "discord.js";
import type { TicketMessage } from "../../services/ticket/ticket.db.js";
import type { TicketData } from "../../types/ticket.js";

export type TranscriptRecipient = "log" | "dm";

function getDisplayId(ticket: TicketData) {
  return ticket.ticket_number ? `#${ticket.ticket_number}` : ticket.ticket_id;
}

function getFileName(ticket: TicketData) {
  const id = ticket.ticket_number ?? ticket.ticket_id.slice(0, 8);
  return `ticket-${id}.txt`;
}

export function buildTranscriptText(
  ticket: TicketData,
  messages: TicketMessage[],
  options?: { closedByTag?: string; closedAt?: number },
): string {
  const displayId = getDisplayId(ticket);
  const openedAt = new Date(ticket.created_at).toLocaleString("pt-BR");
  const closedAt = options?.closedAt
    ? new Date(options.closedAt).toLocaleString("pt-BR")
    : ticket.closed_at
      ? new Date(ticket.closed_at).toLocaleString("pt-BR")
      : "—";

  let content = `${"═".repeat(45)}\n`;
  content += `  BLAZE SYSTEM - TRANSCRIPT DO TICKET\n`;
  content += `${"═".repeat(45)}\n\n`;
  content += `Ticket: ${displayId}\n`;
  content += `ID interno: ${ticket.ticket_id}\n`;
  content += `Categoria: ${ticket.category ?? "—"}\n`;
  content += `Aberto em: ${openedAt}\n`;
  content += `Fechado em: ${closedAt}\n`;

  if (options?.closedByTag) {
    content += `Fechado por: ${options.closedByTag}\n`;
  }
  if (ticket.assumed_by) {
    content += `Assumido por (ID): ${ticket.assumed_by}\n`;
  }

  content += `\n${"─".repeat(45)}\n\n`;

  if (messages.length === 0) {
    content += "(Nenhuma mensagem registrada)\n";
  } else {
    for (const msg of messages) {
      const date = new Date(msg.timestamp).toLocaleString("pt-BR");
      const type = msg.message_type && msg.message_type !== "text" ? ` [${msg.message_type}]` : "";
      content += `[${date}] ${msg.username} (${msg.user_id})${type}:\n`;
      content += `${msg.content}\n`;
      if (msg.attachments) {
        try {
          const urls = JSON.parse(msg.attachments) as string[];
          if (urls.length) {
            content += `Anexos: ${urls.join(", ")}\n`;
          }
        } catch {
          /* ignore */
        }
      }
      content += "\n";
    }
  }

  content += `${"─".repeat(45)}\n`;
  content += `Total de mensagens: ${messages.length}\n`;

  return content;
}

export function createTranscriptAttachment(ticket: TicketData, text: string) {
  const fileName = getFileName(ticket);
  const attachment = new AttachmentBuilder(Buffer.from(text, "utf-8"), {
    name: fileName,
  });
  return { attachment, fileName };
}

export function buildTranscriptContainer(
  ticket: TicketData,
  attachment: AttachmentBuilder,
  options: {
    recipient: TranscriptRecipient;
    authorUser?: User | null;
    closedByUser?: User | null;
  },
) {
  const displayId = getDisplayId(ticket);
  const color =
    options.recipient === "dm" ? constants.colors.primary : constants.colors.azoxo;

  const header =
    options.recipient === "dm"
      ? `## ${icon.pasta} Seu ticket foi finalizado`
      : `## ${icon.pasta} Transcript do Ticket`;

  const description =
    options.recipient === "dm"
      ? "O histórico completo do seu atendimento está no arquivo abaixo."
      : "Ticket encerrado. Histórico de mensagens anexado.";

  return createContainer(
    color,
    header,
    description,
    createSeparator(),
    brBuilder(
      `### ${icon.dark} Ticket`,
      `\`${displayId}\``,
      `### ${icon.pasta} Categoria`,
      `\`${ticket.category ?? "—"}\``,
    ),
    ...(options.authorUser && options.recipient === "log"
      ? [`${icon.estrela} **Autor:** <@${options.authorUser.id}>`]
      : []),
    ...(options.closedByUser
      ? [`${icon.admin} **Fechado por:** <@${options.closedByUser.id}>`]
      : []),
    ...(ticket.assumed_by
      ? [`${icon.verificado} **Assumido por:** <@${ticket.assumed_by}>`]
      : []),
    createSeparator(),
    createFile(attachment),
    createSeparator(),
    `-# ${icon.loading} Blaze System`,
  );
}

export interface DeliverTranscriptOptions {
  client: Client;
  ticket: TicketData;
  messages: TicketMessage[];
  closedById: string;
  closedAt?: number;
  transcriptChannelId?: string | null;
}

export async function deliverTranscript({
  client,
  ticket,
  messages,
  closedById,
  closedAt = Date.now(),
  transcriptChannelId,
}: DeliverTranscriptOptions) {
  const [authorUser, closerUser] = await Promise.all([
    client.users.fetch(ticket.user_id).catch(() => null),
    client.users.fetch(closedById).catch(() => null),
  ]);

  const text = buildTranscriptText(ticket, messages, {
    closedByTag: closerUser?.tag ?? closedById,
    closedAt,
  });

  if (transcriptChannelId) {
    try {
      const logChannel = await client.channels.fetch(transcriptChannelId);
      if (logChannel?.isSendable()) {
        const { attachment } = createTranscriptAttachment(ticket, text);
        await logChannel.send({
          components: [
            buildTranscriptContainer(ticket, attachment, {
              recipient: "log",
              authorUser,
              closedByUser: closerUser,
            }),
          ],
          files: [attachment],
          flags: MessageFlags.IsComponentsV2,
        });
      }
    } catch (err) {
      console.error("[deliverTranscript:log]", err);
    }
  }

  if (authorUser) {
    try {
      const { attachment } = createTranscriptAttachment(ticket, text);
      await authorUser.send({
        components: [
          buildTranscriptContainer(ticket, attachment, {
            recipient: "dm",
            closedByUser: closerUser,
          }),
        ],
        files: [attachment],
        flags: MessageFlags.IsComponentsV2,
      });
    } catch (err) {
      console.error("[deliverTranscript:dm]", {
        userId: ticket.user_id,
        error: err,
      });
    }
  }
}
