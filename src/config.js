import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

export const config = {
  port: Number(process.env.PORT || 3000),
  nodeEnv: process.env.NODE_ENV || "development",
  meta: {
    verifyToken: process.env.META_VERIFY_TOKEN || "",
    accessToken: process.env.META_ACCESS_TOKEN || "",
    phoneNumberId: process.env.META_PHONE_NUMBER_ID || "",
    whatsappBusinessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || ""
  },
  messenger: {
    verifyToken: process.env.MESSENGER_VERIFY_TOKEN || "",
    pageAccessToken: process.env.MESSENGER_PAGE_ACCESS_TOKEN || ""
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY || "",
    model: process.env.OPENAI_MODEL || "gpt-4.1-mini"
  },
  base44: {
    apiBaseUrl: process.env.BASE44_API_BASE_URL || "https://sten-bot-flow.base44.app/api",
    appId: process.env.BASE44_APP_ID || "",
    apiKey: process.env.BASE44_API_KEY || "",
    includeClientIdOnMessages: process.env.BASE44_MESSAGE_HAS_CLIENT_ID === "true"
  },
  bot: {
    businessName: process.env.BOT_BUSINESS_NAME || "La Torre LED Shop",
    timezone: process.env.BOT_TIMEZONE || "America/Tijuana"
  },
  adminWhatsappNumber: process.env.ADMIN_WHATSAPP_NUMBER || ""
};

export function getMissingRequiredEnv() {
  const required = {
    META_VERIFY_TOKEN: config.meta.verifyToken,
    META_ACCESS_TOKEN: config.meta.accessToken,
    META_PHONE_NUMBER_ID: config.meta.phoneNumberId,
    MESSENGER_PAGE_ACCESS_TOKEN: config.messenger.pageAccessToken,
    OPENAI_API_KEY: config.openai.apiKey,
    BASE44_APP_ID: config.base44.appId,
    BASE44_API_KEY: config.base44.apiKey
  };

  return Object.entries(required)
    .filter(([, value]) => !value)
    .map(([key]) => key);
}
