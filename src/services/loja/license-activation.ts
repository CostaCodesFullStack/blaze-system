import type { ProductType } from "@prisma/client";

const LICENSE_ACTIVATION_PATH = "/api/v1/license/activate";
const LICENSE_API_PREFIX = "/api/v1/license";

export interface LicenseActivationPayload {
  guildId: string;
  durationDays: number;
  productType: ProductType;
}

export interface ManualTorcidaActivationParams {
  guildId: string;
  planName: string;
  durationDays: number;
  clientId: string;
  clientUsername: string;
}

function resolveLicenseApiBaseUrl(): string {
  const baseUrl =
    process.env.URL_BOT_TORCIDA ?? process.env.LICENSE_ACTIVATION_WEBHOOK_URL;

  if (!baseUrl) {
    throw new Error(
      "URL_BOT_TORCIDA ou LICENSE_ACTIVATION_WEBHOOK_URL não configurado no ambiente.",
    );
  }

  const trimmed = baseUrl.replace(/\/$/, "");

  if (trimmed.endsWith(LICENSE_ACTIVATION_PATH)) {
    return trimmed.slice(0, -LICENSE_ACTIVATION_PATH.length);
  }

  if (trimmed.endsWith(LICENSE_API_PREFIX)) {
    return trimmed.slice(0, -LICENSE_API_PREFIX.length);
  }

  return trimmed;
}

export function resolveLicenseActivationUrl(): string {
  return `${resolveLicenseApiBaseUrl()}${LICENSE_ACTIVATION_PATH}`;
}

export function resolveLicenseRemovalUrl(guildId: string): string {
  return `${resolveLicenseApiBaseUrl()}${LICENSE_API_PREFIX}/${guildId}`;
}

export function parseDurationDaysFromPlan(planName: string): number {
  const normalized = planName.trim().toLowerCase();

  const monthsMatch = normalized.match(/(\d+)\s*(?:mes|mês|meses|month|months)\b/);
  if (monthsMatch) return Number(monthsMatch[1]) * 30;

  const yearsMatch = normalized.match(/(\d+)\s*(?:ano|anos|year|years)\b/);
  if (yearsMatch) return Number(yearsMatch[1]) * 365;

  const daysMatch = normalized.match(/(\d+)\s*(?:dia|dias|day|days)\b/);
  if (daysMatch) return Number(daysMatch[1]);

  const loneNumber = normalized.match(/\b(\d+)\b/);
  if (loneNumber) return Number(loneNumber[1]);

  return 30;
}

function getFetchErrorDetail(error: unknown): string {
  if (error instanceof Error) {
    const cause = error.cause;

    if (cause instanceof Error) {
      return cause.message;
    }

    if (cause && typeof cause === "object" && "code" in cause) {
      const code = String((cause as { code?: string }).code ?? "");
      const message =
        "message" in cause ? String((cause as { message?: string }).message ?? "") : "";
      return [code, message].filter(Boolean).join(" — ");
    }

    return error.message;
  }

  return String(error);
}

export function isConnectionRefusedError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const err = error as {
    code?: string;
    cause?: { code?: string };
    message?: string;
  };

  if (err.code === "ECONNREFUSED") return true;
  if (err.cause?.code === "ECONNREFUSED") return true;

  if (error instanceof TypeError && String(error.message).includes("fetch failed")) {
    return err.cause?.code === "ECONNREFUSED";
  }

  return false;
}

async function postLicenseActivation(body: Record<string, unknown>): Promise<void> {
  const url = resolveLicenseActivationUrl();
  const token = process.env.LICENSE_ACTIVATION_WEBHOOK_TOKEN;

  if (!token) {
    throw new Error(
      "LICENSE_ACTIVATION_WEBHOOK_TOKEN não configurado no ambiente.",
    );
  }

  console.log(`[loja/license] POST ${url}`);

  let response: Response;

  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
  } catch (error) {
    console.error("Detalhe do erro fetch:", getFetchErrorDetail(error));

    if (isConnectionRefusedError(error)) {
      throw error;
    }

    throw new Error(
      `Falha de rede ao contatar o Bot de Torcida: ${getFetchErrorDetail(error)}`,
    );
  }

  if (!response.ok) {
    const responseBody = await response.text().catch(() => "");
    throw new Error(
      `Bot de Torcida respondeu com erro (HTTP ${response.status})${responseBody ? `: ${responseBody}` : ""}`,
    );
  }
}

export async function notifyLicenseActivation(
  payload: LicenseActivationPayload,
): Promise<void> {
  if (!payload.guildId) {
    console.warn("[loja/license] guildId ausente — notificação ignorada.");
    return;
  }

  const token = process.env.LICENSE_ACTIVATION_WEBHOOK_TOKEN;

  if (!token) {
    console.warn(
      "[loja/license] LICENSE_ACTIVATION_WEBHOOK_TOKEN não configurado — notificação ignorada.",
    );
    return;
  }

  try {
    resolveLicenseActivationUrl();
  } catch {
    console.warn(
      "[loja/license] URL_BOT_TORCIDA ou LICENSE_ACTIVATION_WEBHOOK_URL não configurado — notificação ignorada.",
    );
    return;
  }

  await postLicenseActivation({
    guildId: payload.guildId,
    durationDays: payload.durationDays,
    productType: payload.productType,
  });

  console.log(
    `[loja/license] Licença notificada — guild=${payload.guildId} type=${payload.productType} days=${payload.durationDays}`,
  );
}

export async function activateTorcidaManually(
  params: ManualTorcidaActivationParams,
): Promise<void> {
  await postLicenseActivation({
    guildId: params.guildId,
    durationDays: params.durationDays,
    productType: "TORCIDA",
    planName: params.planName,
    clientId: params.clientId,
    clientUsername: params.clientUsername,
  });

  console.log(
    `[loja/license] Ativação manual — guild=${params.guildId} plan="${params.planName}" client=${params.clientId} days=${params.durationDays}`,
  );
}

async function deleteLicense(guildId: string): Promise<void> {
  const url = resolveLicenseRemovalUrl(guildId);
  const token = process.env.LICENSE_ACTIVATION_WEBHOOK_TOKEN;

  if (!token) {
    throw new Error(
      "LICENSE_ACTIVATION_WEBHOOK_TOKEN não configurado no ambiente.",
    );
  }

  console.log(`[loja/license] DELETE ${url}`);

  let response: Response;

  try {
    response = await fetch(url, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  } catch (error) {
    console.error("Detalhe do erro fetch:", getFetchErrorDetail(error));

    if (isConnectionRefusedError(error)) {
      throw error;
    }

    throw new Error(
      `Falha de rede ao contatar o Bot de Torcida: ${getFetchErrorDetail(error)}`,
    );
  }

  if (!response.ok) {
    const responseBody = await response.text().catch(() => "");
    throw new Error(
      `Bot de Torcida respondeu com erro (HTTP ${response.status})${responseBody ? `: ${responseBody}` : ""}`,
    );
  }
}

export async function removeTorcidaManually(guildId: string): Promise<void> {
  await deleteLicense(guildId);

  console.log(`[loja/license] Remoção manual — guild=${guildId}`);
}
