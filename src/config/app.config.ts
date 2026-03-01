const config = {
  env: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT) || 5000,
  debug: process.env.APP_DEBUG === "true",
  db: {
    url: process.env.MONGODB_URI || "mongodb://localhost:27017/busly",
  },
  jwt: {
    accessSecret: process.env.ACCESS_SECRET || "access_secret_key",
    refreshSecret: process.env.REFRESH_SECRET || "refresh_secret_key",
    accessTokenExpiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRES_IN || "1h",
    refreshTokenExpiresIn: process.env.JWT_REFRESH_TOKEN_EXPIRES_IN || "7d",
  },
  smtp: {
    host: process.env.SMTP_HOST || "smtp.mailtrap.io",
    port: Number(process.env.SMTP_PORT) || 2525,
    user: process.env.SMTP_USER || "user",
    pass: process.env.SMTP_PASS || "pass",
    from: process.env.EMAIL_FROM || "noreply@busly.com",
  },
};

export default config;
