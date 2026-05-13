import dotenv from "dotenv";

dotenv.config();

export function initConfig() {
  return {
    PORT: process.env.PORT || 4000,
    JWT_SECRET: process.env.JWT_SECRET || "change-me",
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || "",
    EMAIL_HOST: process.env.EMAIL_HOST || "",
    EMAIL_PORT: Number(process.env.EMAIL_PORT) || 587,
    EMAIL_USER: process.env.EMAIL_USER || "",
    EMAIL_PASS: process.env.EMAIL_PASS || "",
  };
}
