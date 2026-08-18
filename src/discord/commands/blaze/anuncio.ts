import { createCommand } from "#base";
import { createLabel, createTextInput } from "@magicyan/discord";
import { ApplicationCommandType, ModalBuilder, TextInputStyle } from "discord.js";

createCommand({
  name: "anuncio",
  description: "Criar um anuncio para ser publicado",
  type: ApplicationCommandType.ChatInput,
  defaultMemberPermissions: ["Administrator"],
  async run(interaction) {
    await interaction.showModal(
      new ModalBuilder()
        .setCustomId("anuncio/modal")
        .setTitle("Criar Anúncio")
        .setLabelComponents(
          createLabel(
            "Título do Anúncio",
            createTextInput({
              customId: "titulo",
              placeholder: "Digite o título do anúncio",
              style: TextInputStyle.Short,
              required: true,
              maxLength: 100,
            }),
          ),
          createLabel(
            "Mensagem do Anúncio",
            createTextInput({
              customId: "mensagem",
              placeholder: "Digite a mensagem do anúncio",
              required: true,
              style: TextInputStyle.Paragraph,
              maxLength: 4000,
            }),
          ),
          createLabel(
            "Imagem (opcional)",
            createTextInput({
              customId: "imagem",
              placeholder: "URL da imagem",
              required: false,
              style: TextInputStyle.Short,
              maxLength: 200,
            }),
          ),
        ),
    );
  },
});
