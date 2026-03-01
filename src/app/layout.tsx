import "./globals.css";

import { ConvexClientProvider } from "../providers/convex-client-provider";
import type { Metadata } from "next";
import { ThemeProvider } from "@/providers/theme-provider";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "Yes, it's me! Workspace",
  description: "Secure profile lookup and identity correlation",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ConvexClientProvider>
            {children}
            <Toaster position="bottom-right" />
          </ConvexClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
