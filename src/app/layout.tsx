import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AuthSessionProvider } from "../components/providers/session-provider";

export const metadata: Metadata = {
  title: "Cartilla Digital",
  description: "Aplicacion interna para control de gastos y presupuesto vehicular.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="es">
      <body>
        <AuthSessionProvider>{children}</AuthSessionProvider>
      </body>
    </html>
  );
}
