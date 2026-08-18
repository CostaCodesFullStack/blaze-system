import { createResponder } from "#base";
import { ResponderType } from "@constatic/base";
import {
  createContainer,
  createMediaGallery,
  createSeparator,
  isUrl,
  modalFieldsToRecord,
} from "@magicyan/discord";
import {
  InteractionReplyOptions,
  MessageEditOptions,
  TextChannel,
} from "discord.js";

const EVERYONE_PING_MS = 5000;

createResponder({
  customId: "anuncio/modal",
  types: [ResponderType.Modal],
  cache: "cached",
  async run(interaction) {
    const { titulo, mensagem, imagem } = modalFieldsToRecord(
      interaction.fields,
      (fields) => ({
        titulo: String(fields.titulo),
        mensagem: String(fields.mensagem),
        imagem: fields.imagem ? String(fields.imagem) : undefined,
      }),
    );

    const channel = interaction.channel;
    if (!channel || !(channel instanceof TextChannel)) {
      await interaction.reply(
        anuncioFeedback(constants.colors.azoxo, "Este comando só pode ser usado em canais de texto."),
      );
      return;
    }

    const { container, imagemInvalida } = buildAnuncio({ titulo, mensagem, imagem });
    const everyone = createContainer(constants.colors.blaze, "@everyone");

    try {
      const announcementMessage = await channel.send({
        components: [everyone, container],
        flags: ["IsComponentsV2"],
      });

      setTimeout(async () => {
        try {
          await announcementMessage.edit({
            components: [container],
            flags: ["IsComponentsV2"],
          } satisfies MessageEditOptions);
        } catch (error) {
          console.error("Erro ao atualizar mensagem de anúncio:", error);
        }
      }, EVERYONE_PING_MS);

      const avisoImagem = imagemInvalida
        ? "\n\n⚠️ A URL da imagem é inválida e foi ignorada."
        : "";

      await interaction.reply(
        anuncioFeedback(
          constants.colors.success,
          `✅ Anúncio publicado com sucesso!${avisoImagem}`,
        ),
      );
    } catch (error) {
      console.error("Erro ao enviar anúncio:", error);
      await interaction.reply(
        anuncioFeedback(constants.colors.danger, formatarErroAnuncio(error)),
      );
    }
  },
});

interface AnuncioFields {
  titulo: string;
  mensagem: string;
  imagem?: string;
}

function buildAnuncio({ titulo, mensagem, imagem }: AnuncioFields) {
  const imagemUrl = imagem?.trim();
  const imagemValida = imagemUrl ? isUrl(imagemUrl) : false;
  const imagemInvalida = Boolean(imagemUrl && !imagemValida);

  const componentes = [
    `### ${titulo}`,
    createSeparator(),
    mensagem,
    createSeparator(),
    ...(imagemValida && imagemUrl ? [createMediaGallery(imagemUrl)] : []),
  ];

  return {
    container: createContainer(constants.colors.blaze, ...componentes),
    imagemInvalida,
  };
}

function anuncioFeedback<R>(color: string, message: string): R {
  return {
    components: [createContainer(color, message)],
    flags: ["IsComponentsV2", "Ephemeral"],
  } satisfies InteractionReplyOptions as R;
}

function formatarErroAnuncio(error: unknown): string {
  let message = "❌ Erro ao publicar o anúncio.";

  if (!(error instanceof Error)) {
    return `${message} Tente novamente mais tarde.`;
  }

  if (error.message.includes("Missing Permissions")) {
    message += " O bot não tem permissões para enviar mensagens neste canal.";
  } else if (error.message.includes("Unknown Channel")) {
    message += " O canal foi deletado ou não está acessível.";
  } else if (error.message.includes("Invalid Form Body")) {
    message += " Os dados do anúncio são inválidos. Verifique o conteúdo.";
  } else {
    message += " Tente novamente mais tarde.";
  }

  return message;
}
