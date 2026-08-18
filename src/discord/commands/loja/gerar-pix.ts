import { createCommand } from "#base";
import {
  createContainer,
  createSection,
  createSeparator,
  createThumbnail,
} from "@magicyan/discord";
import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  AttachmentBuilder,
  MessageFlags,
  PermissionFlagsBits,
} from "discord.js";
import { randomUUID } from "node:crypto";
import { icon } from "../../../functions/utils/emojis.js";
import {
  MercadoPagoError,
  createPixPayment,
} from "../../../services/loja/mercadopago.js";
import { formatPrice } from "../../../utils/loja/format.js";
import { config } from "../../config/config.js";

createCommand({
  name: "gerar-pix",
  description: "Gera um PIX manual para venda de plano (Staff)",
  type: ApplicationCommandType.ChatInput,
  defaultMemberPermissions: [PermissionFlagsBits.Administrator],
  options: [
    {
      name: "valor",
      description: "Preço do plano em reais (ex: 49.90)",
      type: ApplicationCommandOptionType.Number,
      required: true,
      minValue: 0.01,
    },
    {
      name: "produto",
      description: "Nome do plano ou produto vendido",
      type: ApplicationCommandOptionType.String,
      required: true,
    },
    {
      name: "cliente",
      description: "Usuário do Discord que está comprando",
      type: ApplicationCommandOptionType.User,
      required: false,
    },
  ],
  async run(interaction) {
    const valor = interaction.options.getNumber("valor", true);
    const produto = interaction.options.getString("produto", true).trim();
    const cliente = interaction.options.getUser("cliente");

    if (!produto) {
      await interaction.reply({
        content: `${icon.warning} Informe o nome do produto.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.deferReply();

    try {
      const pixPayment = await createPixPayment({
        amount: valor,
        email: cliente
          ? `cliente-${cliente.id}@blazetorcidas.com`
          : "comprador@discord.com",
        displayName: cliente
          ? (cliente.globalName ?? cliente.username)
          : undefined,
        description: `${produto} — Venda Manual`,
        externalReference: `manual-${randomUUID()}`,
      });

      const files: AttachmentBuilder[] = [];

      if (pixPayment.qrCodeBase64) {
        const buffer = Buffer.from(pixPayment.qrCodeBase64, "base64");
        files.push(new AttachmentBuilder(buffer, { name: "qrcode.png" }));
      }

      await interaction.editReply({
        content: cliente
          ? `Olá ${cliente}, aqui está o seu pedido!`
          : undefined,
        components: [
          createContainer(
            constants.colors.blaze,
            ...(pixPayment.qrCodeBase64
              ? [
                  createSection({
                    content:
                      `## ${icon.carrinho} Fatura Gerada\n` +
                      `Escaneie o QR Code ao lado ou utilize a chave Copia e Cola abaixo para finalizar a compra do **${produto}**.`,
                    thumbnail: createThumbnail("attachment://qrcode.png"),
                  }),
                ]
              : [
                  `## ${icon.carrinho} Fatura Gerada`,
                  `Utilize a chave Copia e Cola abaixo para finalizar a compra do **${produto}**.`,
                ]),
            createSeparator(),
            `### ${icon.sifrao} Valor`,
            formatPrice(valor),
            createSeparator(),
            `### ${icon.key} Chave Pix (Copia e Cola)`,
            `\`\`\`\n${pixPayment.qrCode}\n\`\`\``,
            createSeparator(),
            "Envie o comprovante para a Staff após o pagamento.",
            createSeparator(),
            config.footer,
          ),
        ],
        files,
        flags: MessageFlags.IsComponentsV2,
      });
    } catch (error) {
      console.error("[gerar-pix]", error);

      const message =
        error instanceof MercadoPagoError
          ? error.message
          : "Erro ao gerar PIX. Tente novamente.";

      await interaction.editReply({
        content: `${icon.erro} Falha ao gerar PIX: ${message}`,
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
      });
    }
  },
});
