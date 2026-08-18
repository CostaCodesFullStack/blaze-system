import { createCommand } from "#base";
import { icon } from "#functions";
import { brBuilder, createContainer, createSeparator } from "@magicyan/discord";
import { ApplicationCommandType, MessageFlags, PermissionFlagsBits } from "discord.js";
import { getConfig } from "../../../services/ticket/config.service.js";
import { config } from "../../config/config.js";

createCommand({
  name: "ticket-config",
  description: "Visualizar configuração atual do sistema de tickets",
  type: ApplicationCommandType.ChatInput,
  defaultMemberPermissions: [PermissionFlagsBits.Administrator],
  async run(interaction) {
    if (!interaction.guildId) {
      await interaction.reply({
        content: "❌ Apenas em servidores",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const guildConfig = getConfig(interaction.guildId);

    if (!guildConfig) {
      await interaction.reply({
        content: "❌ Nenhuma configuração encontrada. Use `/configurar-bot` primeiro.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.reply({
      components: [
        createContainer(
          constants.colors.azoxo,
          `## ${icon.seguranca} Configuração de Tickets`,
          createSeparator(),
          brBuilder(
            `**Canal de transcript:** ${
              guildConfig.transcript_channel_id
                ? `<#${guildConfig.transcript_channel_id}>`
                : "— não configurado"
            }`,
            `**Cargo de staff:** ${
              guildConfig.staff_role_id
                ? `<@&${guildConfig.staff_role_id}>`
                : "— não configurado"
            }`,
            `**Categoria de tickets:** ${
              guildConfig.ticket_category_id
                ? `<#${guildConfig.ticket_category_id}>`
                : "— não configurado"
            }`,
          ),
          createSeparator(),
          "Use `/configurar-bot` para alterar estas opções.",
          config.footer,
        ),
      ],
      flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
    });
  },
});
