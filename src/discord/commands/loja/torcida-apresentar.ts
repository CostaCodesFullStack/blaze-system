import { createCommand } from "#base";
import { icon } from "#functions";
import { brBuilder, createContainer, createSeparator } from "@magicyan/discord";
import {
  ApplicationCommandType,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
} from "discord.js";
import { config } from "../../config/config.js";

createCommand({
  name: "torcida-apresentar",
  description: "Envia a apresentação comercial do Bot Blaze Torcidas",
  type: ApplicationCommandType.ChatInput,
  defaultMemberPermissions: [PermissionFlagsBits.Administrator],
  async run(interaction) {
    const ticketButton = new ButtonBuilder({
      label: "🎫 Abrir Ticket",
      style: ButtonStyle.Link,
      url: "https://canary.discord.com/channels/1441209480116441100/1496913465607065781",
    });

    await interaction.reply({
      components: [
        createContainer(
          constants.colors.blaze,
          brBuilder("# ⚽ Torcidas BOT"),
          createSeparator(),
          brBuilder(
            `**${icon.coroa} Sistema de Hierarquia Inteligente:**`,
            "- Hierarquia com 7 níveis de cargos configuráveis.",
            "- Promoção, rebaixamento e exoneração totalmente automatizados.",
            "- Proteção total para cargos imunes.",
            "- Painel visual da hierarquia atualizado em tempo real.",
          ),
          createSeparator(),
          brBuilder(
            `**${icon.papel} Sistema de Presença:**`,
            "- Criação de listas de presença para reuniões e eventos.",
            "- Confirmação e remoção de presença em tempo real.",
            "- Encerramento oficial da lista pelo responsável.",
            "- Contagem automática de participantes.",
          ),
          createSeparator(),
          brBuilder(
            `**${icon.warning} Sistema de Advertências:**`,
            "- Aplicação de advertências com motivo, multa e prazo.",
            "- Envio automático da advertência no privado do membro.",
            "- Edição, pagamento e remoção de advertências.",
            "- Controle completo das punições da torcida.",
          ),
          createSeparator(),
          brBuilder(
            `**${icon.anuncio} Sistema de Anúncios:**`,
            "- Envio de anúncios formatados para o canal oficial.",
            "- Disparo automático de mensagens privadas para membros verificados.",
            "- Suporte para imagens personalizadas.",
            "- Sistema anti-spam integrado.",
          ),
          createSeparator(),
          brBuilder(
            `**${icon.checkboxchecked} Sistema de Verificação:**`,
            "- Verificação totalmente automatizada.",
            "- Alteração automática do nickname.",
            "- Atribuição automática do cargo de verificado.",
            "- Processo simples através de botões e formulários.",
          ),
          createSeparator(),
          brBuilder(
            `**${icon.calendar} Sistema de Ausências:**`,
            "- Registro formal de ausências.",
            "- Controle de datas de saída e retorno.",
            "- Histórico organizado para a liderança.",
            "- Validação automática dos períodos informados.",
          ),
          createSeparator(),
          brBuilder(
            `**${icon.analyticsbubble} Sistema de Logs:**`,
            "- Registro de promoções, rebaixamentos e exonerações.",
            "- Registro de tentativas sem permissão.",
            "- Auditoria completa das ações administrativas.",
          ),
          createSeparator(),
          brBuilder(
            `**${icon.engine} Painel Administrativo:**`,
            "- Configuração completa diretamente pelo Discord.",
            "- Definição de cargos de liderança e canais do sistema.",
            "- Alteração de nome e logo do BOT.",
            "- Ativação e gerenciamento dos módulos disponíveis.",
          ),
          createSeparator(),
          brBuilder(
            `**${icon.foguete} Recursos Exclusivos:**`,
            "- Sistema SaaS multi-servidor.",
            "- Licenciamento automático com API própria.",
            "- Backup automático diário com restauração de dados.",
            "- Status rotativo personalizado.",
            "- Estrutura otimizada para grandes torcidas.",
          ),
          createSeparator(),
          brBuilder(
            `**${icon.lockclosed} Segurança Avançada:**`,
            "- Controle de permissões por hierarquia.",
            "- Proteção contra ações indevidas.",
            "- Confirmação segura para ações críticas.",
            "- Auditoria completa das operações.",
          ),
          createSeparator(),
          brBuilder(
            `**${icon.editpencilicon} Personalização:**`,
            "- Nome do BOT e logo da torcida configuráveis.",
            "- Canais e cargos totalmente configuráveis.",
          ),
          createSeparator(),
          brBuilder(
            `**${icon.sifrao} Valor do Produto:**`,
            "- R$90,00 pagamento único (licença).",
            "- R$15,00/mês referente à hospedagem.",
            "- Sem taxa de configuração.",
            "- Suporte incluso.",
            "- Atualizações constantes.",
          ),
          createSeparator(),
          ticketButton,
          createSeparator(),
          config.footer,
        ),
      ],
      flags: ["IsComponentsV2"],
    });
  },
});
