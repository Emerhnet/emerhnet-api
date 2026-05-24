import sgMail from "@sendgrid/mail";
import { env } from "../config/env";
import { logger } from "./logger";

sgMail.setApiKey(env.SENDGRID_API_KEY);

const FROM = { email: env.EMAIL_FROM, name: env.EMAIL_FROM_NAME };

interface SendArgs {
  to: string;
  subject: string;
  html: string;
  text: string;
}

async function send({ to, subject, html, text }: SendArgs): Promise<void> {
  try {
    const [response] = await sgMail.send({
      from: FROM,
      to,
      subject,
      html,
      text,
    });
    logger.info(
      {
        to,
        subject,
        statusCode: response.statusCode,
        messageId: response.headers["x-message-id"],
      },
      "email sent",
    );
  } catch (err) {
    const sgErr = err as { code?: number; response?: { body?: unknown } };
    logger.error(
      {
        to,
        subject,
        code: sgErr.code,
        sendgridErrors: sgErr.response?.body,
        message: (err as Error).message,
      },
      "email send failed",
    );
    throw err;
  }
}

function shell(title: string, bodyHtml: string): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#F5F2EC;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#2A2A2A;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;margin:0 auto;background:#FFFFFF;border-radius:12px;border:1px solid #E5E1D8;">
      <tr><td style="padding:24px 32px;border-bottom:1px solid #E5E1D8;">
        <div style="font-size:18px;font-weight:600;color:#3D2B1F;">EMERHNET</div>
      </td></tr>
      <tr><td style="padding:32px;">
        <h1 style="margin:0 0 16px;font-size:20px;font-weight:600;color:#3D2B1F;">${title}</h1>
        ${bodyHtml}
      </td></tr>
      <tr><td style="padding:16px 32px;border-top:1px solid #E5E1D8;font-size:12px;color:#7A6F60;">
        This is an automated message from EMERHNET. Do not reply.
      </td></tr>
    </table>
  </body>
</html>`;
}

export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string,
): Promise<void> {
  const subject = "Reset your EMERHNET password";
  const text = `We received a request to reset your EMERHNET password.\n\nReset link (valid 1 hour):\n${resetUrl}\n\nIf you did not request this, ignore this email.`;
  const html = shell(
    "Reset your password",
    `
    <p style="margin:0 0 16px;font-size:14px;line-height:1.6;">
      We received a request to reset your EMERHNET password. Click the button below to choose a new one. The link is valid for 1 hour.
    </p>
    <p style="margin:24px 0;">
      <a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#3D2B1F;color:#FFFFFF;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">Set new password</a>
    </p>
    <p style="margin:0 0 8px;font-size:12px;color:#7A6F60;">If the button does not work, paste this link into your browser:</p>
    <p style="margin:0 0 16px;font-size:12px;word-break:break-all;color:#3D2B1F;">${resetUrl}</p>
    <p style="margin:0;font-size:13px;color:#7A6F60;">If you did not request a password reset, you can ignore this email.</p>
  `,
  );
  await send({ to, subject, html, text });
}

export async function sendHospitalInvitationEmail(args: {
  to: string;
  hospitalName: string;
  registerUrl: string;
  expiresAt: Date;
}): Promise<void> {
  const { to, hospitalName, registerUrl, expiresAt } = args;
  const expiry = expiresAt.toUTCString();
  const subject = `EMERHNET invitation for ${hospitalName}`;
  const text = `You have been invited to enrol ${hospitalName} on EMERHNET.\n\nComplete registration:\n${registerUrl}\n\nThis link expires on ${expiry}.`;
  const html = shell(
    "You are invited to EMERHNET",
    `
    <p style="margin:0 0 16px;font-size:14px;line-height:1.6;">
      The EMERHNET team has invited <strong>${hospitalName}</strong> to enrol on the platform.
    </p>
    <p style="margin:0 0 16px;font-size:14px;line-height:1.6;">
      Use the secure link below to complete your hospital registration. The hospital name will be pre-filled.
    </p>
    <p style="margin:24px 0;">
      <a href="${registerUrl}" style="display:inline-block;padding:12px 24px;background:#3D2B1F;color:#FFFFFF;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">Begin registration</a>
    </p>
    <p style="margin:0 0 8px;font-size:12px;color:#7A6F60;">If the button does not work, paste this link into your browser:</p>
    <p style="margin:0 0 16px;font-size:12px;word-break:break-all;color:#3D2B1F;">${registerUrl}</p>
    <p style="margin:0;font-size:13px;color:#7A6F60;">This invitation expires on ${expiry}.</p>
  `,
  );
  await send({ to, subject, html, text });
}

export async function sendHospitalAdminWelcomeEmail(args: {
  to: string;
  fullName: string;
  hospitalName: string;
  tempPassword: string;
  signInUrl: string;
}): Promise<void> {
  const { to, fullName, hospitalName, tempPassword, signInUrl } = args;
  const subject = `Your EMERHNET admin account for ${hospitalName}`;
  const text = `Hello ${fullName},\n\nYour hospital ${hospitalName} has been approved on EMERHNET.\n\nSign-in email: ${to}\nTemporary password: ${tempPassword}\n\nSign in: ${signInUrl}\n\nYou will be required to set a new password on first sign-in.`;
  const html = shell(
    `Welcome to EMERHNET`,
    `
    <p style="margin:0 0 16px;font-size:14px;line-height:1.6;">Hello ${fullName},</p>
    <p style="margin:0 0 16px;font-size:14px;line-height:1.6;">
      <strong>${hospitalName}</strong> has been approved on EMERHNET. Your Hospital Admin account is ready.
    </p>
    <table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;margin:16px 0;background:#F5F2EC;border-radius:8px;border:1px solid #E5E1D8;">
      <tr><td style="padding:16px 20px;">
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.04em;color:#7A6F60;font-weight:500;">Login email</div>
        <div style="font-family:ui-monospace,Menlo,monospace;font-size:14px;color:#3D2B1F;margin-top:4px;">${to}</div>
      </td></tr>
      <tr><td style="padding:0 20px 16px;">
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.04em;color:#7A6F60;font-weight:500;">Temporary password</div>
        <div style="font-family:ui-monospace,Menlo,monospace;font-size:14px;color:#3D2B1F;margin-top:4px;">${tempPassword}</div>
      </td></tr>
    </table>
    <p style="margin:24px 0;">
      <a href="${signInUrl}" style="display:inline-block;padding:12px 24px;background:#3D2B1F;color:#FFFFFF;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">Sign in to EMERHNET</a>
    </p>
    <p style="margin:0;font-size:13px;color:#7A6F60;">For security, you will be required to set a new password on first sign-in.</p>
  `,
  );
  await send({ to, subject, html, text });
}
