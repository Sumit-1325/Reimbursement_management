import nodemailer from "nodemailer";

const getMissingMailEnvKeys = () => {
  const requiredKeys = ["MAIL_HOST", "MAIL_PORT", "MAIL_USER", "MAIL_PASS"];
  return requiredKeys.filter((key) => !process.env[key]);
};

const transport = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: Number(process.env.MAIL_PORT),
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

export const sendEmail = async ({ to, subject, text, html }) => {
  try {
    const missingKeys = getMissingMailEnvKeys();
    if (missingKeys.length > 0) {
      const configError = new Error(
        `Missing mail environment variables: ${missingKeys.join(", ")}`
      );
      configError.code = "MAIL_CONFIG_MISSING";
      throw configError;
    }

    const info = await transport.sendMail({
      from: `"Odoo Hackathon Support" <${process.env.MAIL_USER}>`,
      to,
      subject,
      text,
      html,
    });
    console.log("Message sent: %s", info.messageId);
    return info;
  } catch (error) {
    console.error("Email send error:", error);
    if (error?.code === "MAIL_CONFIG_MISSING") {
      throw error;
    }

    throw new Error("Email could not be sent");
  }
};