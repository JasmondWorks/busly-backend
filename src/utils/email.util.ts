import nodemailer from "nodemailer";
import config from "../config/app.config";

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      auth: {
        user: config.smtp.user,
        pass: config.smtp.pass,
      },
    });
  }

  async sendVerificationEmail(to: string, otp: string) {
    const mailOptions = {
      from: config.smtp.from,
      to,
      subject: "Busly - Verify Your Email",
      html: `
        <h1>Email Verification</h1>
        <p>Your one-time password (OTP) is: <strong>${otp}</strong></p>
        <p>This code will expire in 10 minutes.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `,
    };

    if (config.env === "development") {
      console.log(`[EmailService] Would send OTP ${otp} to ${to}`);
      // In dev we might not want to always try to actually connect if we have fake creds
      // return;
    }

    try {
      await this.transporter.sendMail(mailOptions);
    } catch (error) {
      console.error("Error sending email:", error);
      // throw new AppError("There was an error sending the email. Try again later!", 500);
      throw error;
    }
  }
}
