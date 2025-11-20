import type { ReactNode } from "react";
import "./globals.css";
import { AppShell } from "@/components/AppShell";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body className="font-sans antialiased bg-background text-foreground">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}


