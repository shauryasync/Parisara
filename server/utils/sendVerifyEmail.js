import nodemailer from "nodemailer";

export const sendVerificationEmail = async (to, token) => {
  const { EMAIL_USER, EMAIL_PASSWORD, CLIENT_URL } = process.env;

  if (!EMAIL_USER || !EMAIL_PASSWORD) {
    throw new Error("Email credentials are missing from the server environment");
  }
  if (!CLIENT_URL) {
    throw new Error("CLIENT_URL is missing from the server environment");
  }

  const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASSWORD,
    },
  });
  const verifyUrl = `${CLIENT_URL}/verify-email?token=${token}`;

  await transporter.sendMail({
    from: `"Parisara" <${EMAIL_USER}>`,
    to,
    subject: "Verify your email address",
    html: `
      <h2>Verify Your Account</h2>
      <p>Click the link below to verify your email address. This link expires in 24 hours:</p>
      <a href="${verifyUrl}">${verifyUrl}</a>
    `,
  });
};
