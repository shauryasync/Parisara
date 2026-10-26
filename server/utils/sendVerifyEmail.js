export const sendVerificationEmail = async (to, token) => {
  const { RESEND_API_KEY, EMAIL_FROM, CLIENT_URL } = process.env;

  if (!RESEND_API_KEY || !EMAIL_FROM || !CLIENT_URL) {
    throw new Error("Email configuration is missing from the server environment");
  }

  const verifyUrl = `${CLIENT_URL}/verify-email?token=${token}`;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to: [to],
      subject: "Verify your Parisara account",
      html: `
        <h2>Welcome to Parisara!</h2>
        <p>Click the link below to verify your email address. This link expires in 24 hours:</p>
        <a href="${verifyUrl}">${verifyUrl}</a>
      `,
    }),
  });

  if (!response.ok) {
    throw new Error(`Email provider error (${response.status}): ${await response.text()}`);
  }
};
