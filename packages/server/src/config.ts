import { config } from "dotenv-flow";

config();

function getVar(key: string, fallback?: string) {
  const data = process.env[key];

  if (!data) {
    if (fallback) {
      return fallback;
    }
    throw new Error(`Environment variable ${key} is required`);
  }

  return data;
}

const TOKEN_SECRET = getVar("TOKEN_SECRET");
const REFRESH_SECRET = getVar("REFRESH_SECRET");
const PORT = Number(getVar("PORT", "3000"));
const NODE_ENV = getVar("NODE_ENV");
const ADMIN_LIST = JSON.parse(getVar("ADMIN_LIST", "[]"));
const DATABASE_URL = getVar("DATABASE_URL");
const SUPER_USER_ID = getVar("SUPER_USER_ID");

export {
  TOKEN_SECRET,
  REFRESH_SECRET,
  PORT,
  NODE_ENV,
  ADMIN_LIST,
  DATABASE_URL,
  SUPER_USER_ID,
};
