import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aether Task | Premium Collaborative Task Manager",
  description: "A secure, high-performance team task management system featuring modern Kanban boards, real-time analytics dashboards, and role-based workspace collaboration.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
