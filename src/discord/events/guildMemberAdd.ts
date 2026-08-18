import { createEvent } from "#base";
import { icon } from "#functions";
import {
  brBuilder,
  createContainer,
  createMediaGallery,
  createSeparator,
} from "@magicyan/discord";
import { guildConfig } from "../config/config.js";

const img = guildConfig.img;
// ========== EVENTO DE ENTRADA NO SERVIDOR ==========
createEvent({
  name: "Welcome System",
  event: "guildMemberAdd",
  once: false,
  async run(member) {
    console.log(`👋 Novo membro entrou: ${member.user.tag}`);

    // ========== 1. ADICIONAR CARGO AUTOMATICAMENTE ==========
    try {
      const welcomeRole = member.guild.roles.cache.get(guildConfig.guildRoleId);

      if (!welcomeRole) {
        console.error(
          `${icon.crossclosecircle} Cargo "Membro" (ID: ${guildConfig.guildRoleId}) não encontrado`,
        );
        return;
      }

      // Verificar se o bot tem permissão
      const botMember = await member.guild.members.fetch(member.client.user.id);
      if (!botMember.permissions.has("ManageRoles")) {
        console.error(
          `${icon.crossclosecircle} Bot não tem permissão para gerenciar cargos`,
        );
        return;
      }

      // Verificar se o cargo está abaixo do cargo do bot
      if (welcomeRole.position >= botMember.roles.highest.position) {
        console.error(
          `${icon.crossclosecircle} Cargo "${welcomeRole.name}" está acima ou no mesmo nível do cargo do bot`,
        );
        return;
      }

      // Adicionar o cargo ao novo membro
      await member.roles.add(welcomeRole);
      console.log(
        `${icon.checkboxchecked} Cargo "${welcomeRole.name}" adicionado a ${member.user.tag}`,
      );
    } catch (error) {
      console.error(`${icon.crossclosecircle} Erro ao adicionar cargo:`, error);
      // Continue com a mensagem de boas-vindas mesmo se falhar o cargo
    }

    const welcomeChannel = member.guild.channels.cache.get(
      guildConfig.channelId,
    );

    if (!welcomeChannel?.isTextBased()) {
      console.error(
        `${icon.crossclosecircle} Canal de boas-vindas não encontrado ou inválido`,
      );
      return;
    }

    try {
      // Obter contagem de membros
      const memberCount = member.guild.memberCount;

      // Container de boas-vindas
      const welcomeContainer = createContainer(
        constants.colors.blaze,
        brBuilder(`### Seja bem-vindo(a) ${member.user.username}!`),
        createSeparator(),
        brBuilder(`${member.user} você acaba de entrar na **Blaze System**!`),
        createSeparator(),
        brBuilder(
          `> Caso você deseje ser redirecionado para o canal de atendimentos, clique no botão abaixo.`,
          `> Se quiser verificar nossos feedbacks, clique no segundo botão.`,
        ),
        createSeparator(),
        createMediaGallery([{ media: { url: img } }]),
        createSeparator(),
        brBuilder(
          `${icon.person} O servidor agora tem **${memberCount} membros**.`,
          `🔥 **Blaze System** • Bem-vindo ao servidor!`,
        ),
      );

      // Enviar mensagem de boas-vindas
      await welcomeChannel.send({
        flags: ["IsComponentsV2"],
        components: [welcomeContainer],
      });

      console.log(
        `${icon.checkboxchecked} Mensagem de boas-vindas enviada para ${member.user.tag}`,
      );
    } catch (error) {
      console.error(
        `${icon.crossclosecircle} Erro ao enviar mensagem de boas-vindas:`,
        error,
      );
    }
  },
});
