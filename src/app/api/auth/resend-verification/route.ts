import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/src/server/auth/better-auth-config";
import { prisma } from "@/src/lib/prisma";
import { getSetting } from "@/src/lib/app-settings";
import { checkEmailRateLimit, recordEmailSent } from "@/src/lib/email-rate-limit";
import fs from "fs";
import path from "path";

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const userId = session.user.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, emailVerified: true, name: true },
    });

    if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    if (user.emailVerified) return NextResponse.json({ verified: true });

    // DB-backed cooldown
    const { allowed, retryAfter, count } = await checkEmailRateLimit(user.email, "verify");
    if (!allowed) {
      return NextResponse.json({ error: `Espera ${retryAfter} segundos`, retryAfter }, { status: 429 });
    }

    // Create new verification token
    const token = crypto.randomUUID();
    await prisma.verification.upsert({
      where: { identifier: user.email },
      create: {
        identifier: user.email,
        value: token,
        expiresAt: new Date(Date.now() + 3600_000),
        userId,
      },
      update: {
        value: token,
        expiresAt: new Date(Date.now() + 3600_000),
      },
    });

    // Send email using the same template as Better Auth
    if (process.env.SMTP_HOST && process.env.SMTP_PASS) {
      const { default: nodemailer } = await import("nodemailer");
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || "587"),
        secure: process.env.SMTP_SECURE === "true",
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });

      const appName = await getSetting("app_name").catch(() => process.env.NEXT_PUBLIC_APP_NAME || "Nexora Finance");
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const verifyUrl = `${appUrl}/verify-email?token=${token}`;
      const logoUrl = `${appUrl}/icons/icono-n.png`;

      // Load the professional HTML template
      let html: string;
      try {
        const filePath = path.join(process.cwd(), "src", "emails", "verification.html");
        html = fs.readFileSync(filePath, "utf-8");
        html = html.replace(/\{\{appName\}\}/g, appName);
        html = html.replace(/\{\{userName\}\}/g, user.name || "Usuario");
        html = html.replace(/\{\{verificationUrl\}\}/g, verifyUrl);
        html = html.replace(/\{\{logoUrl\}\}/g, logoUrl);
      } catch {
        html = `<div style="font-family:Arial,sans-serif;padding:20px;text-align:center"><img src="${logoUrl}" alt="${appName}" width="48" height="48" style="border-radius:12px;margin-bottom:12px"><h2>${appName}</h2><p>Haz clic para verificar tu cuenta:</p><a href="${verifyUrl}" style="display:inline-block;padding:12px 24px;background:#0A84FF;color:#fff;border-radius:12px;text-decoration:none;font-weight:700">Verificar cuenta</a></div>`;
      }

      await transporter.sendMail({
        from: process.env.SMTP_FROM,
        to: user.email,
        subject: `Verifica tu cuenta — ${appName}`,
        html,
      });
    }

    // Record in DB
    const newCount = await recordEmailSent(user.email, "verify");

    return NextResponse.json({ sent: true, count: newCount });
  } catch {
    return NextResponse.json({ error: "Error al reenviar" }, { status: 500 });
  }
}

// GET — check cooldown status without sending
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true, emailVerified: true },
    });

    if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    if (user.emailVerified) return NextResponse.json({ verified: true });

    const { allowed, retryAfter, count } = await checkEmailRateLimit(user.email, "verify");
    return NextResponse.json({ allowed, retryAfter, count, verified: false });
  } catch {
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
