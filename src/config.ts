import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const authBaseUrl = required("AUTH_BASE_URL").replace(/\/+$/, "");

export const config = {
  port: Number(process.env.PORT ?? 5000),
  mongoUri: required("MONGODB_URI"),
  dbName: process.env.DB_NAME ?? "hopehive",
  clientUrls: (process.env.CLIENT_URL ?? "http://localhost:3000")
    .split(",")
    .map((url) => url.trim().replace(/\/+$/, ""))
    .filter(Boolean),
  authBaseUrl,
  jwksUrl: process.env.AUTH_JWKS_URL ?? `${authBaseUrl}/api/auth/jwks`,
  timezone: process.env.APP_TIMEZONE ?? "Asia/Dhaka",
};
