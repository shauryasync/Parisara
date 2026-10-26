export const sendVerificationEmail = async (to, token) => {
  const { BREVO_API_KEY, EMAIL_FROM, CLIENT_URL } = process.env;

  if (!BREVO_API_KEY || !EMAIL_FROM || !CLIENT_URL) {
    throw new Error("Email configuration missing in server environment");
  }

  const verifyUrl = `${CLIENT_URL}/verify-email?token=${token}`;

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "api-key": BREVO_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sender: { name: "Parisara", email: EMAIL_FROM },
      to: [{ email: to }],
      subject: "Verify your Parisara account",
      htmlContent: `
        <h2>Welcome to Parisara!</h2>
        <p>Click the link below to verify your email address:</p>
        <a href="${verifyUrl}">${verifyUrl}</a>
      `,
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`Brevo Error (${response.status}): ${errorData}`);
  }
};
