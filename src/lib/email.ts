import nodemailer from "nodemailer";

export async function sendOtpEmail(to: string, otp: string) {
  try {
    const transporter = nodemailer.createTransport({
      host: "smtp-relay.brevo.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.BREVO_SMTP_USER,
        pass: process.env.BREVO_SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false, // 🔥 FIX self-signed cert issue
      },
    });

    await transporter.sendMail({
      from: `"${process.env.BREVO_SENDER_NAME}" <${process.env.BREVO_SENDER_EMAIL}>`,
      to,
      subject: "Your Zuntra Interview OTP",
      html: `
        <div style="font-family:Arial, sans-serif; padding:20px;">
          <h2>Your OTP Code</h2>
          <p>Your verification code is:</p>
          <h1 style="color:#2563eb; font-size:32px;">${otp}</h1>
          <p>This code expires in 10 minutes.</p>
        </div>
      `,
    });

    console.log("OTP email sent:", to);
  } catch (err) {
    console.error("Brevo SMTP error:", err);
    throw new Error("Failed to send OTP email");
  }
}
