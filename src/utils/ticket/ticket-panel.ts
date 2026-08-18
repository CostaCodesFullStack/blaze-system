import { icon } from "#functions";
import {
  createContainer,
  createRow,
  createSection,
  createSeparator,
  createThumbnail,
} from "@magicyan/discord";
import {
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  UserSelectMenuBuilder,
} from "discord.js";
import { config } from "../../discord/config/config.js";

const img =
  "https://cdn.discordapp.com/attachments/1497388495356821744/1501804160671027230/avatarBS.png?ex=69fd679e&is=69fc161e&hm=782ec831dd44b5fb3cb8ead135f0e9e2e7e8da959a06c22b079a5841134cf9a2&";

export function buildTicketPanel() {
  return createContainer(
    constants.colors.primary,
    createSection({
      content:
        `## ${icon.pasta} Sistema de Atendimento\n` +
        "**Bem-vindo ao nosso sistema de atendimento!**\n" +
        "Clique no menu abaixo para abrir um ticket. Nossa equipe de suporte está pronta para ajudar.",
      thumbnail: createThumbnail(img),
    }),
    createSeparator(),
    "• Seja respeitoso e claro em sua solicitação",
    "• Não compartilhe informações sensíveis",
    "• Aguarde o retorno da equipe",
    createSeparator(),
    createRow(
      new StringSelectMenuBuilder({
        customId: "ticket:create",
        placeholder: "📩 Abrir um novo ticket",
        options: [
          {
            label: "Suporte & Dúvidas",
            description: "Falar com a equipe de suporte",
            value: "suporte",
            emoji: { id: icon.engine.id, name: "ticket", animated: icon.engine.animated },
          },
          {
            label: "Orçamentos & Compras",
            description: "Falar com a equipe de compras",
            value: "compra",
            emoji: { id: icon.carrinho.id, name: "compra", animated: icon.carrinho.animated },
          },
          {
            label: "Parcerias",
            description: "Propostas de parcerias ou revendas",
            value: "parcerias",
            emoji: { id: icon.estrela.id, name: "parcerias", animated: icon.estrela.animated },
          },
          {
            label: "Reportar Bugs",
            description: "Relatar falhas, erros ou comportamento inesperado",
            value: "bugs",
            emoji: { id: icon.admin.id, name: "erro", animated: icon.admin.animated },
          }
        ],
      }),
    ),
    createSeparator(),
    config.footer,
  );
}

export function buildTicketMessage(
  userId: string,
  ticketId: string,
  category: string,
  subject: string,
  ticketNumber: number,
) {
  return createContainer(
    constants.colors.primary,
    `### ${icon.pasta} Atendimento`,
    `Olá <@${userId}>, Seja bem-vindo(a) ao ticket.`,
    "Aqui você poderá falar diretamente com a nossa equipe. Todos os responsáveis já estão cientes da abertura do ticket e foram devidamente notificados. Em breve, um atendente irá esclarecer suas dúvidas.",
    createSeparator(),
    "Pedimos, por gentileza, que evite enviar mensagens privadas (DMs) aos atendentes. Basta aguardar por aqui e, assim que possível, você será atendido.",
    createSeparator(),
    `### ${icon.seguranca} Categoria Escolhida:`,
    `\`\`\` ${category} \`\`\``,
    createSeparator(),
    `### ${icon.dark} ID do Ticket:`,
    `\`\`\` ${ticketNumber} \`\`\``,
    createSeparator(),
    `### 🔍 Assunto do Ticket:`,
    `\`\`\` ${subject} \`\`\``,
    createSeparator(),
    createRow(
      new ButtonBuilder({
        customId: `ticket/assume/${ticketId}`,
        label: "Assumir Ticket",
        emoji: { id: icon.estrela.id, name: "estrela", animated: icon.estrela.animated },
        style: ButtonStyle.Success,
      }),
      new ButtonBuilder({
        customId: `ticket/admin/${ticketId}`,
        label: "Painel Admin",
        emoji: { id: icon.admin.id, name: "admin", animated: icon.admin.animated },
        style: ButtonStyle.Secondary,
      }),
      new ButtonBuilder({
        customId: `ticket/close/${ticketId}`,
        label: "Fechar Ticket",
        emoji: { id: icon.erro.id, name: "erro", animated: icon.erro.animated },
        style: ButtonStyle.Danger,
      }),
    ),
    createSeparator(),
    config.footer,
  );
}

export function buildAdminPanel(userId: string, ticketId: string) {
  return createContainer(
    constants.colors.danger,
    `### ${icon.admin} PAINEL ADMINISTRATIVO DO TICKET`,
    `Olá <@${userId}>, seja bem-vindo ao painel administrativo do ticket.`,
    "Aqui você encontrará todas as opções de gerenciamento do ticket, caso haja alguma dúvida se informe com os responsáveis.",
    createSeparator(),
    "• **Adicionar Membro**",
    "Adiciona um membro ao ticket.",
    createRow(
      new UserSelectMenuBuilder({
        customId: `ticket/addmember/${ticketId}`,
        placeholder: "Selecione um membro para ADICIONAR",
      }),
    ),
    createSeparator(),
    "• **Remover Membro**",
    "Remove um membro do ticket.",
    createRow(
      new UserSelectMenuBuilder({
        customId: `ticket/removemember/${ticketId}`,
        placeholder: "Selecione um membro para REMOVER",
      }),
    ),
    createSeparator(),
    "• **Notificar Membro**",
    "Envia um aviso na DM do autor do ticket.",
    createRow(
      new ButtonBuilder({
        customId: `ticket/notify/${ticketId}`,
        label: "Notificar",
        emoji: { id: icon.bell.id, name: "bell", animated: icon.bell.animated },
        style: ButtonStyle.Secondary,
      }),
    ),
    createSeparator(),
    "• **Chamada de voz**",
    "Inicie ou encerre uma chamada temporária neste ticket.",
    createRow(
      new ButtonBuilder({
        customId: `ticket/voice/start/${ticketId}`,
        label: "Iniciar Chamada",
        emoji: { name: "🎙️" },
        style: ButtonStyle.Primary,
      }),
      new ButtonBuilder({
        customId: `ticket/voice/end/${ticketId}`,
        label: "Encerrar Chamada",
        emoji: { name: "🔇" },
        style: ButtonStyle.Secondary,
      }),
    ),
    createSeparator(),
    "• **Finalizar Ticket**",
    "Inicia o processo de fechamento do ticket.",
    createRow(
      new ButtonBuilder({
        customId: `ticket/close/${ticketId}`,
        label: "Finalizar Ticket",
        emoji: { id: icon.erro.id, name: "erro", animated: icon.erro.animated },
        style: ButtonStyle.Danger,
      }),
    ),
    createSeparator(),
    config.footer,
  );
}

export function buildTicketNotifyDm(
  ticketNumber: number | undefined,
  staffUserId: string,
  guildId: string,
  channelId: string,
) {
  const label = ticketNumber ? `#${ticketNumber}` : "seu ticket";

  return createContainer(
    constants.colors.yellow,
    `### ${icon.bell} Você foi notificado`,
    `A equipe está aguardando sua resposta no ticket **${label}**.`,
    "Por favor, acesse o canal do ticket quando possível.",
    createSeparator(),
    `${icon.admin} **Staff:** <@${staffUserId}>`,
    createSeparator(),
    createRow(
      new ButtonBuilder({
        label: "Ir para o ticket",
        emoji: { id: icon.ticket.id, name: "ticket", animated: icon.ticket.animated },
        style: ButtonStyle.Link,
        url: `https://discord.com/channels/${guildId}/${channelId}`,
      }),
    ),
    createSeparator(),
    config.footer,
  );
}

export function buildTicketAssumedMessage(staffUserId: string) {
  return createContainer(
    constants.colors.yellow,
    `### ${icon.estrela} Ticket Assumido`,
    `O staff <@${staffUserId}> assumiu o atendimento deste ticket e em breve irá lhe atender.`,
    createSeparator(),
    config.footer,
  );
}
