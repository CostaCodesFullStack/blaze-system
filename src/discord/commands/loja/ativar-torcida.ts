import { createCommand } from "#base";
import { createContainer, createSeparator } from "@magicyan/discord";
import {
  ActionRowBuilder,
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  PermissionFlagsBits,
} from "discord.js";
import {
  activateTorcidaManually,
  isConnectionRefusedError,
  parseDurationDaysFromPlan,
} from "../../../services/loja/license-activation.js";
import { config } from "../../config/config.js";
import { icon } from "../../../functions/utils/emojis.js";

createCommand({
  name: "ativar-torcida",
  description: "Ativa manualmente a licença do Bot de Torcida (Staff)",
  type: ApplicationCommandType.ChatInput,
  defaultMemberPermissions: [PermissionFlagsBits.Administrator],
  options: [
    {
      name: "guild_id",
      description: "ID do servidor Discord onde o Bot de Torcida será ativado",
      type: ApplicationCommandOptionType.String,
      required: true,
    },
    {
      name: "plano",
      description: "Nome do plano ou tempo de licença (ex: 30 dias, 1 mês)",
      type: ApplicationCommandOptionType.String,
      required: true,
    },
    {
      name: "cliente",
      description: "Usuário do Discord que receberá a licença",
      type: ApplicationCommandOptionType.User,
      required: true,
    },
  ],
  async run(interaction) {
    const guildId = interaction.options.getString("guild_id", true).trim();
    const plano = interaction.options.getString("plano", true).trim();
    const cliente = interaction.options.getUser("cliente", true);

    if (!/^\d{17,20}$/.test(guildId)) {
      await interaction.reply({
        content: "❌ `guild_id` inválido. Informe um ID numérico de servidor Discord.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (!plano) {
      await interaction.reply({
        content: "❌ Informe o nome ou duração do plano.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const durationDays = parseDurationDaysFromPlan(plano);

    try {
      await activateTorcidaManually({
        guildId,
        planName: plano,
        durationDays,
        clientId: cliente.id,
        clientUsername: cliente.globalName ?? cliente.username,
      });

      const addBotRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder({
          label: "Adicionar Bot de Torcida",
          style: ButtonStyle.Link,
          url: "https://discord.com/oauth2/authorize?client_id=1511077211330056394&permissions=8&integration_type=0&scope=bot",
        }),
      );

      await interaction.editReply({
        components: [
          createContainer(
            constants.colors.success,
            "## ✅ Torcida Ativada",
            createSeparator(),
            `**Servidor:** \`${guildId}\``,
            `**Plano:** ${plano}`,
            `**Duração enviada:** ${durationDays} dia(s)`,
            `**Cliente:** ${cliente} (\`${cliente.id}\`)`,
            createSeparator(),
            "O Bot de Torcida recebeu a ativação com sucesso.",
            createSeparator(),
            addBotRow,
            createSeparator(),
            config.footer,
          ),
        ],
        flags: MessageFlags.IsComponentsV2,
      });
    } catch (error) {
      console.error("[ativar-torcida]", error);

      if (isConnectionRefusedError(error)) {
        await interaction.editReply({
          content:
            `${icon.erro} **Bot de Torcida offline.** Não foi possível conectar na porta 3001.\n` +
            "Ligue o segundo terminal (Bot de Torcida) e tente novamente.",
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
      });
        return;
      }

      const message =
        error instanceof Error
          ? error.message
          : "Erro desconhecido ao ativar a torcida.";

      await interaction.editReply({
        content: `${icon.erro} Falha ao ativar torcida: ${message}`,  
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
      });
    }
  },
});
