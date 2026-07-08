import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/src/lib/prisma";
import { getSetting } from "@/src/lib/app-settings";
import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";

const smtpConfigured = !!(
  process.env.SMTP_HOST && process.env.SMTP_PASS && process.env.SMTP_FROM
);

// Create transporter if SMTP is configured
let transporter: nodemailer.Transporter | null = null;
if (smtpConfigured) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

function loadTemplate(name: string, vars: Record<string, string>): string {
  try {
    const filePath = path.join(process.cwd(), "src", "emails", `${name}.html`);
    let html = fs.readFileSync(filePath, "utf-8");
    for (const [key, value] of Object.entries(vars)) {
      html = html.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
    }
    return html;
  } catch {
    // Fallback minimal template — appName is always passed from sendEmail
    return `<div style="font-family:Arial,sans-serif;padding:20px"><h2>${vars.appName || "Nexora Finance"}</h2><p>${vars.userName || ""}, haz clic en el enlace:</p><a href="${vars.verificationUrl || vars.resetUrl || "#"}">Continuar</a></div>`;
  }
}

async function sendEmail(to: string, subject: string, template: string, vars: Record<string, string>) {
  console.log(`[EMAIL] sendEmail called — to: ${to}, subject: "${subject}", template: ${template}, transporterReady: ${!!transporter}`);
  if (!transporter) { console.error("[EMAIL] No transporter configured!"); return; }

  // Always inject the app name from DB settings (falls back to env)
  if (!vars.appName) {
    try { vars.appName = await getSetting("app_name"); }
    catch { vars.appName = process.env.NEXT_PUBLIC_APP_NAME || "Nexora Finance"; }
  }
  try {
    const html = loadTemplate(template, vars);
    console.log(`[EMAIL] Template loaded (${html.length} chars), sending via SMTP...`);
    const info = await transporter.sendMail({ from: process.env.SMTP_FROM, to, subject, html });
    console.log(`[EMAIL] Sent "${subject}" to ${to} — messageId: ${info.messageId}`);
  } catch (e) {
    console.error(`[EMAIL] FAILED to send to ${to}:`, e);
  }
}

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "mysql" }),

  // Explicit base URL so Better Auth builds correct absolute links in emails
  baseURL: process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",

  // Trust our own app URL so redirectTo in password-reset requests is accepted
  trustedOrigins: [
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    process.env.BETTER_AUTH_URL || "http://localhost:3000",
  ],

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: smtpConfigured,
    autoSignIn: !smtpConfigured,
    // sendResetPassword MUST always be defined — Better Auth throws RESET_PASSWORD_DISABLED if absent
    sendResetPassword: async (data: { user: { name?: string; email: string }; url: string; token: string }) => {
      console.log("[RESET-PASSWORD] sendResetPassword triggered for:", data.user.email);
      console.log("[RESET-PASSWORD] smtpConfigured:", smtpConfigured);

      if (!smtpConfigured) {
        console.warn("[RESET-PASSWORD] SMTP not configured — skipping email delivery");
        return;
      }

      try {
        await sendEmail(
          data.user.email,
          `Restablece tu contraseña — ${await getSetting("app_name").catch(() => process.env.NEXT_PUBLIC_APP_NAME || "Nexora Finance")}`,
          "reset-password",
          {
            userName: data.user.name || "Usuario",
            resetUrl: data.url,
          }
        );
        console.log("[RESET-PASSWORD] Email enviado a:", data.user.email);
      } catch (e) {
        console.error("[RESET-PASSWORD] ERROR al enviar email:", e);
      }
    },
  },

  emailVerification: smtpConfigured ? {
    sendVerificationEmail: async ({ user, url }) => {
      const appName = await getSetting("app_name").catch(() => process.env.NEXT_PUBLIC_APP_NAME || "Nexora Finance");
      console.log("[EMAIL] Sending verification to:", user.email);
      await sendEmail(user.email, `Verifica tu cuenta — ${appName}`, "verification", {
        userName: user.name,
        verificationUrl: url,
      });
    },
  } : undefined,

  session: {
    expiresIn: 24 * 60 * 60, // 24 hours by default
    updateAge: 24 * 60 * 60,
    cookieCache: { enabled: false },
  },

  advanced: {
    cookies: {
      session_token: {
        name: "nexora.session_token",
        attributes: {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          path: "/",
        },
      },
    },
    crossSubDomainCookies: { enabled: false },
  },
});
