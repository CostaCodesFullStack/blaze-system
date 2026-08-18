import { createResponder } from "#base";
import { ResponderType } from "@constatic/base";
import { brBuilder, createContainer } from "@magicyan/discord";
import {
  type ChannelSelectMenuInteraction,
  MessageFlags,
  PermissionFlagsBits,
  type RoleSelectMenuInteraction,
} from "discord.js";
import {
  invalidateConfigCache,
  setConfig,
} from "../../../services/ticket/config.service.js";
import { buildMainPanel } from "../../../utils/ticket/panel.js";

async function returnToMainPanel(
  interaction: ChannelSelectMenuInteraction | RoleSelectMenuInteraction,
) {
  try {
    await interaction.editReply({
      components: [buildMainPanel()],
    });
  } catch (err) {
    console.error("[returnToMainPanel]", err);
  }
}

createResponder({
  customId: "config/set_transcript",
  types: [ResponderType.ChannelSelect],
  cache: "cached",
  async run(interaction) {
    if (!interaction.guildId) {
      await interaction.reply({ content: "❌ Apenas em servidores", flags: MessageFlags.Ephemeral });
      return;
    }
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      await interaction.reply({ content: "❌ Apenas administradores", flags: MessageFlags.Ephemeral });
      return;
    }

    const channelId = interaction.values[0];
    const result = setConfig(interaction.guildId, {
      transcript_channel_id: channelId,
    });

    if (!result.success) {
      await interaction.reply({ content: "❌ Erro ao salvar transcript", flags: MessageFlags.Ephemeral });
      return;
    }

    invalidateConfigCache(interaction.guildId);

    try {
      await interaction.update({
        components: [
          createContainer(
            constants.colors.success,
            brBuilder("**CONFIG SALVA**", `Transcript: <#${channelId}>`),
          ),
        ],
      });
      await returnToMainPanel(interaction);
    } catch {
      /* token expirado */
    }
  },
});

createResponder({
  customId: "config/set_staff",
  types: [ResponderType.RoleSelect],
  cache: "cached",
  async run(interaction) {
    if (!interaction.guildId) {
      await interaction.reply({ content: "❌ Apenas em servidores", flags: MessageFlags.Ephemeral });
      return;
    }
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      await interaction.reply({ content: "❌ Apenas administradores", flags: MessageFlags.Ephemeral });
      return;
    }

    const roleId = interaction.values[0];
    const result = setConfig(interaction.guildId, { staff_role_id: roleId });

    if (!result.success) {
      await interaction.reply({ content: "❌ Erro ao salvar staff", flags: MessageFlags.Ephemeral });
      return;
    }

    invalidateConfigCache(interaction.guildId);

    try {
      await interaction.update({
        components: [
          createContainer(
            constants.colors.success,
            brBuilder("**CONFIG SALVA**", `Staff: <@&${roleId}>`),
          ),
        ],
      });
      await returnToMainPanel(interaction);
    } catch {
      /* token expirado */
    }
  },
});

createResponder({
  customId: "config/set_category",
  types: [ResponderType.ChannelSelect],
  cache: "cached",
  async run(interaction) {
    if (!interaction.guildId) {
      await interaction.reply({ content: "❌ Apenas em servidores", flags: MessageFlags.Ephemeral });
      return;
    }
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      await interaction.reply({ content: "❌ Apenas administradores", flags: MessageFlags.Ephemeral });
      return;
    }

    const categoryId = interaction.values[0];
    const result = setConfig(interaction.guildId, {
      ticket_category_id: categoryId,
    });

    if (!result.success) {
      await interaction.reply({ content: "❌ Erro ao salvar categoria", flags: MessageFlags.Ephemeral });
      return;
    }

    invalidateConfigCache(interaction.guildId);

    try {
      await interaction.update({
        components: [
          createContainer(
            constants.colors.success,
            brBuilder("**CONFIG SALVA**", `Categoria: <#${categoryId}>`),
          ),
        ],
      });
      await returnToMainPanel(interaction);
    } catch {
      /* token expirado */
    }
  },
});
