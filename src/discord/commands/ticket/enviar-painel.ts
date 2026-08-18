import { createCommand } from "#base";
import { MessageFlags, PermissionFlagsBits } from "discord.js";
import { buildTicketPanel } from "../../../utils/ticket/ticket-panel.js";

createCommand({
  name: "enviar-painel",
  description: "Envia o painel de tickets no canal",
  defaultMemberPermissions: [PermissionFlagsBits.Administrator],
  async run(interaction) {
    try {
      const channel = interaction.channel;
      if (!channel?.isSendable()) {
        await interaction.reply({
          content: "❌ Este comando só pode ser usado em canais de texto.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      await channel.send({
        components: [buildTicketPanel()],
        flags: MessageFlags.IsComponentsV2,
      });

      await interaction.reply({
        content: "✅ Painel de tickets enviado com sucesso!",
        flags: MessageFlags.Ephemeral,
      });
    } catch (err) {
      console.error("[enviar-painel]", err);
      await interaction.reply({
        content: "❌ Erro ao enviar painel de tickets",
        flags: MessageFlags.Ephemeral,
      });
    }
  },
});
