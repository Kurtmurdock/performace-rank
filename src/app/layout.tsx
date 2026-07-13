import type { Metadata } from "next";
import "./globals.css";
import { TarjaNoticias } from "@/components/TarjaNoticias";

export const metadata: Metadata = {
  title: "Performace · Rank de Vendas",
  description: "Ranking de vendas por loja",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">
        <TarjaNoticias />
        {children}
      </body>
    </html>
  );
}
