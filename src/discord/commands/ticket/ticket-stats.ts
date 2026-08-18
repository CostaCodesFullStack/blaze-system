import { createCommand } from "#base";
import { icon } from "#functions";
import { createContainer, createSeparator } from "@magicyan/discord";
import { ApplicationCommandType, MessageFlags, PermissionFlagsBits } from "discord.js";
import {
  getGuildFeedbackStats,
  getTopStaffByRating,
} from "../../../services/ticket/feedback.db.js";
import { getGuildTicketStats } from "../../../services/ticket/ticket.db.js";
import { config } from "../../config/config.js";

function formatDuration(ms: number) {
  if (!ms || ms <= 0) return "—";
  const minutes = Math.floor(ms / 60000);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${hours}h ${rest}min`;
}

createCommand({
  name: "ticket-stats",
  description: "Estatísticas do sistema de tickets",
  type: ApplicationCommandType.ChatInput,
  defaultMemberPermissions: [PermissionFlagsBits.ManageGuild],
  async run(interaction) {
    if (!interaction.guildId) {
      await interaction.reply({
        content: "❌ Apenas em servidores",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const stats = getGuildTicketStats(interaction.guildId);
    const feedback = getGuildFeedbackStats(interaction.guildId);
    const topStaff = getTopStaffByRating(interaction.guildId, 5);

    const categoryLines = Object.entries(stats.byCategory)
      .map(([cat, count]) => `• **${cat}:** ${count}`)
      .join("\n") || "—";

    const staffLines =
      topStaff.length > 0
        ? topStaff
            .map(
              (s, i) =>
                `${i + 1}. <@${s.staff_id}> — ${s.avg_rating.toFixed(1)}⭐ (${s.count} avaliações)`,
            )
            .join("\n")
        : "—";

    await interaction.reply({
      components: [
        createContainer(
          constants.colors.primary,
          `## ${icon.pasta} Estatísticas de Tickets`,
          createSeparator(),
          `**Total:** ${stats.total}`,
          `**Abertos:** ${stats.open}`,
          `**Fechados:** ${stats.closed}`,
          `**Tempo médio de atendimento:** ${formatDuration(stats.avgDurationMs)}`,
          createSeparator(),
          `### ${icon.estrela} Avaliações`,
          `**Média:** ${feedback.count ? feedback.avg.toFixed(1) : "—"} / 5`,
          `**Total de feedbacks:** ${feedback.count}`,
          createSeparator(),
          `### Por categoria`,
          categoryLines,
          createSeparator(),
          `### Top staff (avaliação)`,
          staffLines,
          createSeparator(),
          config.footer,
        ),
      ],
      flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
    });
  },
});
