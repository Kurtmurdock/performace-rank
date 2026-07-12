"use client";
import { Sidebar, TopBar, BellButton } from "@/components/Sidebar";
import { getSessao } from "@/lib/sessao";
import { ArrowLeft, ExternalLink } from "lucide-react";

export default function ReciclaLeadPage() {
  const sessao = getSessao();
  return (
    <main className="min-h-screen bg-background text-foreground px-4 py-8 md:px-10">
      <BellButton />
      <TopBar />
      <div className="flex flex-col md:flex-row gap-8">
        <Sidebar nomeUsuario={sessao?.nome} />
        <div className="flex-1">
          <a href="/" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-accent mb-4"><ArrowLeft size={15} /> Voltar ao Rank</a>
          <h1 className="text-3xl md:text-4xl font-black mb-2">Recicla Lead</h1>
          <p className="text-muted-foreground text-sm mb-6">Ferramenta externa de reciclagem de leads</p>
          <a
            href="https://www.reciclalead.com.br/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 h-12 px-6 rounded-lg bg-accent text-white font-bold text-sm"
          >
            <ExternalLink size={16} /> Abrir Recicla Lead
          </a>
        </div>
      </div>
    </main>
  );
}
