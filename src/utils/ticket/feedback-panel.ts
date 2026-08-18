import { icon } from "#functions";
import {
  createContainer,
  createRow,
  createSeparator,
} from "@magicyan/discord";
import { ButtonBuilder, ButtonStyle } from "discord.js";
import { config } from "../../discord/config/config.js";

export function buildFeedbackPanel(ticketId: string, ticketNumber?: number) {
  const label = ticketNumber ? `#${ticketNumber}` : ticketId.slice(0, 8);

  const ratingButtons = Array.from({ length: 5 }, (_, i) => {
    const rating = i + 1;
    return new ButtonBuilder({
      customId: `ticket/feedback/${ticketId}/${rating}`,
      label: `${rating}`,
      emoji: { name: "⭐" },
      style:
        rating <= 2
          ? ButtonStyle.Danger
          : rating <= 4
            ? ButtonStyle.Primary
            : ButtonStyle.Success,
    });
  });

  return createContainer(
    constants.colors.primary,
    `### ⭐ Avalie seu atendimento`,
    `Seu ticket **${label}** foi finalizado.`,
    "Como você avalia o suporte recebido?",
    createSeparator(),
    createRow(...ratingButtons),
    createSeparator(),
    config.footer,
  );
}

export function buildFeedbackThanksContainer(rating: number, hasComment: boolean) {
  return createContainer(
    constants.colors.success,
    `### ${icon.verificado} Obrigado pelo feedback!`,
    `Sua avaliação: **${"⭐".repeat(rating)}** (${rating}/5)`,
    ...(hasComment ? ["Seu comentário foi registrado."] : []),
    createSeparator(),
    config.footer,
  );
}
