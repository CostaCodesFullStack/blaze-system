import { randomUUID } from "node:crypto";

const MP_API_BASE = "https://api.mercadopago.com";
const MP_PAYMENTS_URL = `${MP_API_BASE}/v1/payments`;
const MP_ORDERS_URL = `${MP_API_BASE}/v1/orders`;

export class MercadoPagoError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "MercadoPagoError";
  }
}

export interface PixPaymentResult {
  orderId: string;
  paymentId: string;
  qrCode: string;
  qrCodeBase64?: string;
  ticketUrl?: string;
}

export interface MercadoPagoPaymentDetails {
  id: string;
  status: string;
  externalReference?: string;
}

export interface MercadoPagoOrderDetails {
  id: string;
  status: string;
  externalReference?: string;
  payments: Array<{
    id: string;
    status: string;
    statusDetail?: string;
  }>;
}

interface MercadoPagoPaymentResponse {
  id?: number | string;
  status?: string;
  external_reference?: string;
  message?: string;
  cause?: unknown;
  point_of_interaction?: {
    transaction_data?: {
      qr_code?: string;
      qr_code_base64?: string;
      ticket_url?: string;
    };
  };
}

interface MercadoPagoOrderPayment {
  id?: string;
  status?: string;
  status_detail?: string;
  payment_method?: {
    qr_code?: string;
    qr_code_base64?: string;
    ticket_url?: string;
  };
  point_of_interaction?: {
    transaction_data?: {
      qr_code?: string;
      qr_code_base64?: string;
      ticket_url?: string;
    };
  };
}

interface MercadoPagoOrderResponse {
  id?: string;
  status?: string;
  external_reference?: string;
  message?: string;
  cause?: unknown;
  transactions?: {
    payments?: MercadoPagoOrderPayment[];
  };
}

/** Ativo em dev ou quando MP_SANDBOX=true. Exige payer com e-mail @testuser.com. */
export function isMercadoPagoSandbox(): boolean {
  if (process.env.MP_SANDBOX === "false") return false;
  if (process.env.MP_SANDBOX === "true") return true;

  return process.env.ENV === "dev" || process.env.NODE_ENV === "development";
}

function getAccessToken(): string {
  const token = process.env.MP_ACCESS_TOKEN;

  if (!token) {
    throw new MercadoPagoError("MP_ACCESS_TOKEN não configurado no ambiente.");
  }

  if (!isMercadoPagoSandbox() && token.startsWith("TEST-")) {
    throw new MercadoPagoError(
      "Credencial TEST- detectada fora do sandbox. Use MP_ACCESS_TOKEN de produção (APP_USR-) " +
        "ou defina MP_SANDBOX=true para testes.",
    );
  }

  return token;
}

function buildHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${getAccessToken()}`,
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-Idempotency-Key": randomUUID(),
  };
}

const PAYER_EMAIL_FALLBACK = "comprador@discord.com";
const PAYER_GENERIC_FIRST_NAME = "Cliente";
const PAYER_GENERIC_LAST_NAME = "Discord";

function isValidPayerEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function resolvePayerEmail(email: string | undefined): string {
  if (!email || !isValidPayerEmail(email)) {
    return PAYER_EMAIL_FALLBACK;
  }

  return email.trim();
}

function sanitizePayerNamePart(name: string): string {
  return name
    .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, "")
    .replace(/[^\p{L}\p{N}\s'-]/gu, "")
    .trim();
}

function isValidPayerNamePart(name: string): boolean {
  return name.length >= 1 && name.length <= 50;
}

function resolvePayerNames(
  firstName?: string,
  lastName?: string,
  displayName?: string,
): { first_name: string; last_name: string } {
  let first = firstName ? sanitizePayerNamePart(firstName) : "";
  let last = lastName ? sanitizePayerNamePart(lastName) : "";

  if (!first && !last && displayName) {
    const parts = sanitizePayerNamePart(displayName).split(/\s+/).filter(Boolean);

    if (parts.length >= 2) {
      first = parts[0] ?? "";
      last = parts.slice(1).join(" ");
    } else if (parts.length === 1) {
      first = parts[0] ?? "";
    }
  }

  if (isValidPayerNamePart(first) && isValidPayerNamePart(last)) {
    return { first_name: first, last_name: last };
  }

  if (isValidPayerNamePart(first) && !last) {
    return { first_name: first, last_name: PAYER_GENERIC_LAST_NAME };
  }

  return {
    first_name: PAYER_GENERIC_FIRST_NAME,
    last_name: PAYER_GENERIC_LAST_NAME,
  };
}

function buildProductionPayer(params: {
  email: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
}) {
  return {
    email: resolvePayerEmail(params.email),
    ...resolvePayerNames(params.firstName, params.lastName, params.displayName),
  };
}

const SANDBOX_PAYER_EMAIL_FALLBACK = "teste@testuser.com";

function buildSandboxPayer(params: {
  firstName?: string;
  lastName?: string;
  displayName?: string;
}) {
  return {
    email: process.env.MP_TEST_PAYER_EMAIL ?? SANDBOX_PAYER_EMAIL_FALLBACK,
    ...resolvePayerNames(params.firstName, params.lastName, params.displayName),
  };
}

function extractPixFromOrderPayment(
  payment: MercadoPagoOrderPayment | undefined,
): Pick<PixPaymentResult, "qrCode" | "qrCodeBase64" | "ticketUrl"> | null {
  if (!payment) return null;

  const method = payment.payment_method;
  const transaction = payment.point_of_interaction?.transaction_data;

  const qrCode = transaction?.qr_code ?? method?.qr_code;
  const qrCodeBase64 = transaction?.qr_code_base64 ?? method?.qr_code_base64;
  const ticketUrl = transaction?.ticket_url ?? method?.ticket_url;

  if (!qrCode) return null;

  return { qrCode, qrCodeBase64, ticketUrl };
}

function mapOrderResponse(data: MercadoPagoOrderResponse): MercadoPagoOrderDetails {
  return {
    id: data.id ?? "",
    status: data.status ?? "unknown",
    externalReference: data.external_reference,
    payments: (data.transactions?.payments ?? []).map((payment) => ({
      id: payment.id ?? "",
      status: payment.status ?? "unknown",
      statusDetail: payment.status_detail,
    })),
  };
}

/**
 * Cria PIX via Checkout Transparente (Orders API) conforme documentação oficial:
 * https://www.mercadopago.com.br/developers/pt/docs/checkout-api-orders/payment-integration/pix
 */
async function createPixOrder(params: {
  amount: number;
  email: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  externalReference: string;
  sandbox: boolean;
}): Promise<PixPaymentResult> {
  try {
    const amountStr = params.amount.toFixed(2);

    const response = await fetch(MP_ORDERS_URL, {
      method: "POST",
      headers: buildHeaders(),
      body: JSON.stringify({
        type: "online",
        external_reference: params.externalReference,
        total_amount: amountStr,
        processing_mode: "automatic",
        payer: params.sandbox
          ? buildSandboxPayer({
              firstName: params.firstName,
              lastName: params.lastName,
              displayName: params.displayName,
            })
          : buildProductionPayer({
              email: params.email,
              firstName: params.firstName,
              lastName: params.lastName,
              displayName: params.displayName,
            }),
        transactions: {
          payments: [
            {
              amount: amountStr,
              payment_method: {
                id: "pix",
                type: "bank_transfer",
              },
            },
          ],
        },
      }),
    });

    const data = (await response.json()) as MercadoPagoOrderResponse;

    if (!response.ok) {
      throw new MercadoPagoError(
        data.message ?? "Erro ao gerar pagamento PIX no Mercado Pago (Orders API).",
        response.status,
        data.cause ?? data,
      );
    }

    const orderPayment = data.transactions?.payments?.[0];
    const pix = extractPixFromOrderPayment(orderPayment);

    if (!pix || !data.id) {
      throw new MercadoPagoError(
        "Resposta PIX inválida: order ou código copia e cola não retornado.",
        response.status,
        data,
      );
    }

    console.log(
      `[loja/mp] PIX gerado — order=${data.id} payment=${orderPayment?.id ?? "?"} status=${orderPayment?.status ?? "?"}`,
    );

    return {
      orderId: data.id,
      paymentId: orderPayment?.id ?? data.id,
      ...pix,
    };
  } catch (error) {
    if (error instanceof MercadoPagoError) {
      console.log(JSON.stringify(error.details, null, 2));
    }

    throw error;
  }
}

export async function getOrderById(orderId: string): Promise<MercadoPagoOrderDetails> {
  const response = await fetch(`${MP_ORDERS_URL}/${orderId}`, {
    headers: {
      Authorization: `Bearer ${getAccessToken()}`,
      Accept: "application/json",
    },
  });

  const data = (await response.json()) as MercadoPagoOrderResponse;

  if (!response.ok) {
    throw new MercadoPagoError(
      data.message ?? "Erro ao consultar order no Mercado Pago.",
      response.status,
      data.cause ?? data,
    );
  }

  return mapOrderResponse(data);
}

export async function getPaymentById(
  paymentId: string,
): Promise<MercadoPagoPaymentDetails> {
  const response = await fetch(`${MP_PAYMENTS_URL}/${paymentId}`, {
    headers: {
      Authorization: `Bearer ${getAccessToken()}`,
      Accept: "application/json",
    },
  });

  const data = (await response.json()) as MercadoPagoPaymentResponse;

  if (!response.ok) {
    throw new MercadoPagoError(
      data.message ?? "Erro ao consultar pagamento no Mercado Pago.",
      response.status,
      data.cause ?? data,
    );
  }

  return {
    id: String(data.id),
    status: data.status ?? "unknown",
    externalReference: data.external_reference,
  };
}

export async function createPixPayment(params: {
  amount: number;
  email: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  description: string;
  externalReference: string;
  notificationUrl?: string;
}): Promise<PixPaymentResult> {
  const sandbox = isMercadoPagoSandbox();

  if (sandbox) {
    console.log("[loja/mp] Modo sandbox — Orders API (/v1/orders) + payer @testuser.com");
  } else {
    console.log("[loja/mp] Modo produção — Orders API (/v1/orders)");
  }

  // Orders API: notificações configuradas no painel MP (tópico Order), não via notification_url.
  void params.description;
  void params.notificationUrl;

  return createPixOrder({
    amount: params.amount,
    email: params.email,
    firstName: params.firstName,
    lastName: params.lastName,
    displayName: params.displayName,
    externalReference: params.externalReference,
    sandbox,
  });
}

export function buildMercadoPagoNotificationUrl(): string | undefined {
  const baseUrl = process.env.WEBHOOK_BASE_URL?.replace(/\/$/, "");
  if (!baseUrl) return undefined;

  return `${baseUrl}/webhooks/mercadopago`;
}

export function isOrderApproved(order: MercadoPagoOrderDetails): boolean {
  const approvedPayment = order.payments.find((payment) => payment.status === "approved");

  if (approvedPayment) return true;

  return order.status === "processed";
}

export function getApprovedOrderPaymentId(order: MercadoPagoOrderDetails): string | undefined {
  return order.payments.find((payment) => payment.status === "approved")?.id;
}
