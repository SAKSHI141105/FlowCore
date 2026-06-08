import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FlowCore · AI-Powered Cognitive Terminal OS",
  description: "A cognitive operating layer sitting above your shell that captures command executions, analyzes behavioral patterns, and predicts errors and sequences.",
  keywords: ["terminal", "shell", "cognitive shell", "ai terminal", "command autocomplete", "developer productivity"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" class="dark">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Space+Grotesk:wght@400;500;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </head>
      <body class="cyber-grid min-h-screen flex flex-col font-inter bg-bgDark text-gray-200 antialiased">
        {children}
      </body>
    </html>
  );
}
