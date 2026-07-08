import type { Metadata } from "next";
import { AppShell } from "@/src/components/layout/app-shell";
import { VerifyEmailGate } from "@/src/components/layout/verify-email-gate";

export const metadata: Metadata = {
  title: `${process.env.NEXT_PUBLIC_APP_NAME || "Nexora Finance"} — Dashboard`,
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell>
      <VerifyEmailGate>{children}</VerifyEmailGate>
    </AppShell>
  );
}
