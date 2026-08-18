import { createResponder } from "#base";
import { ResponderType } from "@constatic/base";
import { createContainer, createRow, createSeparator } from "@magicyan/discord";
import {
  ButtonBuilder,
  ButtonStyle,
  ChannelSelectMenuBuilder,
  ChannelType,
  MessageFlags,
  PermissionFlagsBits,
  RoleSelectMenuBuilder,
} from "discord.js";
import { buildTicketPanel } from "../../../utils/ticket/ticket-panel.js";

createResponder({
  customId: "config:main",
  types: [ResponderType.StringSelect],
  cache: "cached",
  async run(interaction) {
    if (!interaction.guildId) {
      await interaction.reply({
        content: "❌ Este comando só funciona em servidores",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (
      !interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)
    ) {
      await interaction.reply({
        content: "❌ Apenas administradores podem usar este comando",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const action = interaction.values[0];

    try {
      if (action === "send_panel") {
        await interaction.reply({
          content: "✅ Painel de tickets enviado com sucesso!",
          flags: MessageFlags.Ephemeral,
        });

        await interaction.channel?.send({
          components: [buildTicketPanel()],
          flags: MessageFlags.IsComponentsV2,
        });
        return;
      }

      if (action === "transcript") {
        await interaction.update({
          components: [
            createContainer(
              constants.colors.primary,
              "## Configurar Canal de Transcript",
              createSeparator(),
              "Selecione o canal onde os transcripts dos tickets serão enviados.",
              createSeparator(),
              createRow(
                new ChannelSelectMenuBuilder({
                  customId: "config/set_transcript",
                  placeholder: "Selecione um canal de texto",
                  channelTypes: [ChannelType.GuildText],
                }),
              ),
            ),
          ],
        });
        return;
      }

      if (action === "staff_role") {
        await interaction.update({
          components: [
            createContainer(
              constants.colors.primary,
              "## Configurar Cargo de Staff",
              createSeparator(),
              "Selecione o cargo que será responsável pelos tickets.",
              createSeparator(),
              createRow(
                new RoleSelectMenuBuilder({
                  customId: "config/set_staff",
                  placeholder: "Selecione um cargo",
                }),
              ),
            ),
          ],
        });
        return;
      }

      if (action === "ticket_category") {
        await interaction.update({
          components: [
            createContainer(
              constants.colors.primary,
              "## Configurar Categoria de Tickets",
              createSeparator(),
              "Selecione a categoria onde os tickets serão criados.",
              createSeparator(),
              createRow(
                new ChannelSelectMenuBuilder({
                  customId: "config/set_category",
                  placeholder: "Selecione uma categoria",
                  channelTypes: [ChannelType.GuildCategory],
                }),
              ),
            ),
          ],
        });
        return;
      }

      if (action === "plan") {
        await interaction.update({
          components: [
            createContainer(
              constants.colors.warning,
              "## Gerenciar Plano",
              createSeparator(),
              "**Plano Atual:** `Free`",
              createSeparator(),
              "Você está usando o plano gratuito.",
              "Para gerenciar seu plano, acesse o link do Discord:",
              createSeparator(),
              createRow(
                new ButtonBuilder({
                  label: "Acessar Discord",
                  style: ButtonStyle.Link,
                  url: "https://discord.gg/RXDEBXj4Tr",
                }),
              ),
            ),
          ],
        });
      }
    } catch (err: unknown) {
      const code = (err as { code?: number })?.code;
      if (code === 10062 || code === 40060) return;
      console.error("[config:main]", err);
      try {
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({
            content: "❌ Erro ao processar configuração",
            flags: MessageFlags.Ephemeral,
          });
        }
      } catch {
        /* ignora */
      }
    }
  },
});
