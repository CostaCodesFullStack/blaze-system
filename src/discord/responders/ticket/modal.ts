import { createResponder } from "#base";
import { icon } from "#functions";
import { ResponderType } from "@constatic/base";
import { createContainer, createRow } from "@magicyan/discord";
import {
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  type Client,
  type Guild,
  type GuildMember,
  type ModalSubmitInteraction,
} from "discord.js";
import { getConfig } from "../../../services/ticket/config.service.js";
import {
  createTicket,
  getNextTicketNumber,
  getUserOpenTicket,
  isTicketRateLimited,
} from "../../../services/ticket/ticket.db.js";
import {
  createTicketChannel,
  generateTicketId,
  validateTicketConfig,
} from "../../../utils/ticket/ticket-helpers.js";
import { buildTicketMessage } from "../../../utils/ticket/ticket-panel.js";
import { config } from "../../config/config.js";

const categoryLabel: Record<string, string> = {
  suporte: "Suporte & Dúvidas",
  compra: "Orçamentos & Compras",
  parcerias: "Parcerias",
  bugs: "Reportar Bugs",
};

async function cleanupChannel(client: Client, channelId?: string) {
  if (!channelId) return;

  try {
    const channel = await client.channels.fetch(channelId);
    if (channel && "deletable" in channel && channel.deletable) {
      await channel.delete();
    }
  } catch (error) {
    console.error("[cleanupChannel]", error);
  }
}

async function sendTicketMessage(
  interaction: ModalSubmitInteraction,
  channelId: string,
  ticketId: string,
  categoryName: string,
  subject: string,
  ticketNumber: number,
) {
  try {
    const channel = await interaction.client.channels.fetch(channelId);
    if (channel?.isSendable()) {
      await channel.send({
        components: [
          buildTicketMessage(
            interaction.user.id,
            ticketId,
            categoryName,
            subject,
            ticketNumber,
          ),
        ],
        flags: MessageFlags.IsComponentsV2,
      });
    }
  } catch (error) {
    console.error("[sendTicketMessage]", error);
  }
}

async function sendSuccessConfirmation(
  interaction: ModalSubmitInteraction,
  channelId: string,
) {
  const ticketButton = createRow(
    new ButtonBuilder({
      label: "Ir para o Ticket",
      emoji: { id: icon.ticket.id, name: "ticket", animated: icon.ticket.animated },
      url: `https://discord.com/channels/${interaction.guildId}/${channelId}`,
      style: ButtonStyle.Link,
    }),
  );

  await interaction.editReply({
    components: [
      createContainer(
        constants.colors.success,
        "### Ticket Criado",
        `Acesse seu ticket em <#${channelId}>`,
        config.footer,
        ticketButton,
      ),
    ],
    flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
  });
}

createResponder({
  customId: "ticket/modal/:category",
  types: [ResponderType.Modal, ResponderType.ModalComponent],
  cache: "cached",
  async run(interaction, { category }) {
    if (!interaction.guildId || !interaction.member || !interaction.guild) {
      await interaction.reply({
        content: "❌ Este comando só funciona em servidores",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const subject = interaction.fields.getTextInputValue("assunto");
      const categoryName = categoryLabel[category] ?? category;

      const existingTicket = getUserOpenTicket(
        interaction.guildId,
        interaction.user.id,
      );

      if (existingTicket) {
        await interaction.editReply({
          content: `⚠️ Você já possui um ticket aberto: <#${existingTicket.channel_id}>`,
        });
        return;
      }

      if (isTicketRateLimited(interaction.guildId, interaction.user.id)) {
        await interaction.editReply({
          content:
            "⚠️ Você atingiu o limite de tickets por hora. Aguarde antes de abrir outro.",
        });
        return;
      }

      const config = getConfig(interaction.guildId);
      const configValidation = validateTicketConfig(config);

      if (!configValidation.valid) {
        await interaction.editReply({
          content: `❌ ${configValidation.error}`,
        });
        return;
      }

      const ticketNumber = getNextTicketNumber(interaction.guildId);

      const createChannelResult = await createTicketChannel(
        interaction.guild as Guild,
        interaction.member as GuildMember,
        config!.ticket_category_id!,
        config!.staff_role_id!,
        ticketNumber,
      );

      if (!createChannelResult.success) {
        await interaction.editReply({
          content: `❌ Erro ao criar ticket: ${createChannelResult.error}`,
        });
        return;
      }

      const duplicateTicket = getUserOpenTicket(
        interaction.guildId,
        interaction.user.id,
      );

      if (duplicateTicket) {
        await cleanupChannel(interaction.client, createChannelResult.channelId);
        await interaction.editReply({
          content: `⚠️ Você já possui um ticket aberto: <#${duplicateTicket.channel_id}>`,
        });
        return;
      }

      const ticketId = generateTicketId();
      const ticketCreated = createTicket({
        ticket_id: ticketId,
        guild_id: interaction.guildId,
        channel_id: createChannelResult.channelId!,
        user_id: interaction.user.id,
        created_at: Date.now(),
        ticket_number: ticketNumber,
        category: categoryName,
      });

      if (!ticketCreated) {
        await cleanupChannel(interaction.client, createChannelResult.channelId);

        const fallbackTicket = getUserOpenTicket(
          interaction.guildId,
          interaction.user.id,
        );

        if (fallbackTicket) {
          await interaction.editReply({
            content: `⚠️ Você já possui um ticket aberto: <#${fallbackTicket.channel_id}>`,
          });
          return;
        }

        await interaction.editReply({
          content: "❌ Erro ao registrar ticket no banco de dados",
        });
        return;
      }

      await sendTicketMessage(
        interaction,
        createChannelResult.channelId!,
        ticketId,
        categoryName,
        subject,
        ticketNumber,
      );

      await sendSuccessConfirmation(interaction, createChannelResult.channelId!);
    } catch (error: unknown) {
      const code = (error as { code?: number })?.code;
      if (code === 40060 || code === 10062) return;

      console.error("[ticket/modal]", error);

      await interaction.editReply({
        content: "❌ Erro inesperado ao criar ticket. Tente novamente.",
      });
    }
  },
});
