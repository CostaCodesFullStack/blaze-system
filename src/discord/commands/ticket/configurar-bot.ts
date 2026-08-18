import { createCommand } from "#base";
import { PermissionFlagsBits } from "discord.js";
import { buildMainPanel } from "../../../utils/ticket/panel.js";

createCommand({
  name: "configurar-bot",
  description: "Painel de configuração do bot de tickets",
  defaultMemberPermissions: [PermissionFlagsBits.Administrator],
  async run(interaction) {
    try {
      await interaction.reply({
        components: [buildMainPanel()],
        flags: ["Ephemeral", "IsComponentsV2"],
      });
    } catch (err: unknown) {
      const code = (err as { code?: number })?.code;
      if (code !== 10062) console.error("[configurar-bot]", err);
    }
  },
});
