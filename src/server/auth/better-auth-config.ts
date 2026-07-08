import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/src/lib/prisma";
import { getSetting } from "@/src/lib/app-settings";
import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";

// Read admin preference for email verification (checks DB every time — cached at settings layer)
async function shouldRequireEmailVerification(): Promise<boolean> {
  if (!smtpConfigured) return false;
  try {
    return await getSetting("require_email_verification") === "true";
  } catch {
    return true; // default: require if SMTP available
  }
}

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
    // Fallback minimal template
    const appName = vars.appName || "Nexora Finance";
    const logoUrl = vars.logoUrl || "";
    const link = vars.verificationUrl || vars.resetUrl || "#";
    return `<div style="font-family:Arial,sans-serif;padding:20px;text-align:center">${logoUrl ? `<img src="${logoUrl}" alt="${appName}" width="48" height="48" style="border-radius:12px;margin-bottom:12px">` : ""}<h2>${appName}</h2><p>${vars.userName || ""}, haz clic en el enlace:</p><a href="${link}" style="display:inline-block;padding:12px 24px;background:#0A84FF;color:#fff;border-radius:12px;text-decoration:none;font-weight:700">Continuar</a></div>`;
  }
}

async function sendEmail(to: string, subject: string, template: string, vars: Record<string, string>) {
  console.log(`[EMAIL] sendEmail called — to: ${to}, subject: "${subject}", template: ${template}, transporterReady: ${!!transporter}`);
  if (!transporter) { console.error("[EMAIL] No transporter configured!"); return; }

  // Always inject the app name and logo from DB settings (falls back to env)
  if (!vars.appName) {
    try { vars.appName = await getSetting("app_name"); }
    catch { vars.appName = process.env.NEXT_PUBLIC_APP_NAME || "Nexora Finance"; }
  }
  if (!vars.logoUrl) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    vars.logoUrl = `${appUrl}/icons/icono-n.png`;
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
    // Always allow login — unverified users get a gate modal instead of being blocked.
    // Verification email is still sent (if SMTP + admin enabled).
    requireEmailVerification: false,
    autoSignIn: true,
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
      // Check if admin requires email verification
      const requireVerification = await shouldRequireEmailVerification();
      if (!requireVerification) {
        // Admin disabled verification — auto-verify the user
        console.log("[EMAIL] Verification disabled by admin — auto-verifying:", user.email);
        await prisma.user.update({ where: { id: user.id }, data: { emailVerified: true } });
        return;
      }

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
