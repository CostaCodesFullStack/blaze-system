import { validateEnv } from "@constatic/base";
import { z } from "zod";
import "./constants.js";
import "./services/ticket/feedback.db.js";
import "./services/ticket/voice.db.js";

export const env = await validateEnv(z.looseObject({
    BOT_TOKEN: z.string("Discord Bot Token is required").min(1),
    WEBHOOK_LOGS_URL: z.url().optional(),
    GUILD_ID: z.string().optional(),
    MP_ACCESS_TOKEN: z.string().min(1).optional(),
    MP_TEST_ACCESS_TOKEN: z.string().min(1).optional(),
    MP_SANDBOX: z.enum(["true", "false"]).optional(),
    MP_TEST_PAYER_EMAIL: z.string().email().optional(),
    WEBHOOK_PORT: z.string().optional(),
    WEBHOOK_BASE_URL: z.url().optional(),
    LOJA_SALES_LOG_CHANNELS: z.string().optional(),
    URL_BOT_TORCIDA: z.url().optional(),
    LICENSE_ACTIVATION_WEBHOOK_URL: z.url().optional(),
    LICENSE_ACTIVATION_WEBHOOK_TOKEN: z.string().min(1).optional(),
}));