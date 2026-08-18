import { createContainer, createRow, createSeparator } from "@magicyan/discord";
import { StringSelectMenuBuilder } from "discord.js";

export function buildMainPanel() {
  return createContainer(
    constants.colors.primary,
    `## Menu de Configuração do servidor`,
    createSeparator(),
    `Olá! Seja bem-vindo ao painel de configurações da Blaze System.`,
    `Configure o BOT de forma simples e organizada.`,
    createSeparator(),
    `Plano ativo: **FREE**`,
    createSeparator(),
    `Para configurar o BOT, use o menu abaixo:`,
    createSeparator(),
    createRow(
      new StringSelectMenuBuilder({
        customId: "config:main",
        placeholder: "⚙️ Selecione uma opção de configuração",
        options: [
          { label: "Gerenciar Plano", value: "plan" },
          { label: "Enviar Painel", value: "send_panel" },
          { label: "Canal de Transcript", value: "transcript" },
          { label: "Cargo responsável", value: "staff_role" },
          { label: "Categoria de abertura", value: "ticket_category" },
        ],
      }),
    ),
  );
}
