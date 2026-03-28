import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: process.env.SMTP_INSECURE !== "true",
  },
});

export async function sendOtp(to: string, otp: string): Promise<void> {
  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject: "Your TimeForge verification code",
    text: `Your verification code is: ${otp}\n\nThis code expires in 10 minutes.\n\n— TimeForge by Praveen`,
    html: `<p>Your verification code is: <strong>${otp}</strong></p><p>This code expires in 10 minutes.</p><p style="color:#cc161c;font-size:14px;margin-top:24px">TimeForge by Praveen</p>`,
  });
}
