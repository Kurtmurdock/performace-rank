"use client";
import { Sidebar, TopBar, BellButton } from "@/components/Sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { getSessao } from "@/lib/sessao";
import { ArrowLeft } from "lucide-react";

export default function AnunciosPage() {
  const sessao = getSessao();
  return (
    <main className="min-h-screen bg-background text-foreground px-4 py-8 md:px-10">
      <BellButton />
      <TopBar />
      <div className="flex flex-col md:flex-row gap-8">
        <Sidebar nomeUsuario={sessao?.nome} />
        <div className="flex-1">
          <a href="/" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-accent mb-4"><ArrowLeft size={15} /> Voltar ao Rank</a>
          <h1 className="text-3xl md:text-4xl font-black mb-2">Monitor de Anúncios</h1>
          <p className="text-muted-foreground text-sm mb-6">Acompanhamento dos anúncios publicados</p>
          <Card className="border-border max-w-lg">
            <CardContent className="py-8 text-center text-muted-foreground">
              🚧 Essa tela depende de uma integração externa (portal de anúncios) que ainda não foi conectada ao backend. Me diga qual serviço vocês usam pra eu integrar de verdade.
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
