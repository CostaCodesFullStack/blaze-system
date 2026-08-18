import { createCommand } from "#base";
import { createContainer, createSeparator } from "@magicyan/discord";
import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  MessageFlags,
  PermissionFlagsBits,
} from "discord.js";
import {
  isConnectionRefusedError,
  removeTorcidaManually,
} from "../../../services/loja/license-activation.js";
import { config } from "../../config/config.js";
import { icon } from "../../../functions/utils/emojis.js";

createCommand({
  name: "remover-torcida",
  description: "Remove manualmente a licença do Bot de Torcida (Staff)",
  type: ApplicationCommandType.ChatInput,
  defaultMemberPermissions: [PermissionFlagsBits.Administrator],
  options: [
    {
      name: "guild_id",
      description: "ID do servidor Discord onde o acesso será cortado",
      type: ApplicationCommandOptionType.String,
      required: true,
    },
  ],
  async run(interaction) {
    const guildId = interaction.options.getString("guild_id", true).trim();

    if (!/^\d{17,20}$/.test(guildId)) {
      await interaction.reply({
        content: "❌ `guild_id` inválido. Informe um ID numérico de servidor Discord.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      await removeTorcidaManually(guildId);

      await interaction.editReply({
        components: [
          createContainer(
            constants.colors.success,
            "## ✅ Acesso Cortado",
            createSeparator(),
            `**Servidor:** \`${guildId}\``,
            createSeparator(),
            "A licença do Bot de Torcida foi removida com sucesso.",
            "O acesso ao bot neste servidor foi encerrado.",
            createSeparator(),
            config.footer,
          ),
        ],
        flags: MessageFlags.IsComponentsV2,
      });
    } catch (error) {
      console.error("[remover-torcida]", error);

      if (isConnectionRefusedError(error)) {
        await interaction.editReply({
          content:
            `${icon.erro} **Bot de Torcida offline.** Não foi possível conectar na Discloud.\n` +
            "Verifique se o Bot de Torcida está online e tente novamente.",
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
        });
        return;
      }

      const message =
        error instanceof Error
          ? error.message
          : "Erro desconhecido ao remover a torcida.";

      await interaction.editReply({
        content: `${icon.erro} Falha ao remover torcida: ${message}`,
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
      });
    }
  },
});
