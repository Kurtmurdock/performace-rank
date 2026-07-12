"use client";

import { useEffect, useState } from "react";
import { Sidebar, TopBar, BellButton } from "@/components/Sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { chamarApi, getSessao } from "@/lib/sessao";
import { ArrowLeft, Palette } from "lucide-react";
import { PainelConfigVisual } from "@/components/PainelConfigVisual";

export default function FinanceiroPage() {
  const sessao = getSessao();
  const [motos, setMotos] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [configVisualAberto, setConfigVisualAberto] = useState(false);

  useEffect(() => {
    chamarApi({ acao: "rh_listar_estoque_mobile" }).then((data) => {
      if (data && data.ok) setMotos((data.motos || []).filter((m: any) => m.status.includes("Vendido") && !m.valorEntrada));
      setCarregando(false);
    });
  }, []);

  return (
    <main className="min-h-screen bg-background text-foreground px-4 py-8 md:px-10">
      <BellButton />
      <TopBar />
      <div className="flex flex-col md:flex-row gap-8">
        <Sidebar nomeUsuario={sessao?.nome} />
        <div className="flex-1">
          <div className="flex items-center justify-between mb-4">
            <a href="/" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-accent"><ArrowLeft size={15} /> Voltar ao Rank</a>
            <button onClick={() => setConfigVisualAberto(true)} className="h-10 px-4 rounded-lg bg-white/5 border border-white/10 text-sm font-semibold flex items-center gap-2 hover:border-accent transition-colors">
              <Palette size={15} /> Configurações Visuais
            </button>
          </div>
          <h1 className="text-3xl md:text-4xl font-black mb-2">Painel Financeiro</h1>
          <p className="text-muted-foreground text-sm mb-6">Motos vendidas sem custo declarado ainda</p>

          {carregando && <p className="text-muted-foreground">Carregando...</p>}
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {motos.map((m) => (
              <Card key={m.linha} className="border-border">
                <CardContent className="py-4">
                  <p className="font-bold">{m.marca} {m.modelo}</p>
                  <p className="text-xs text-muted-foreground">{m.placa || "Sem placa"} · Linha {m.linha}</p>
                  <p className="text-xs text-orange-400 mt-1">⚠️ Custo não declarado</p>
                </CardContent>
              </Card>
            ))}
            {!carregando && motos.length === 0 && (
              <p className="text-muted-foreground text-sm">Nenhuma pendência de custo. ✅</p>
            )}
          </div>
        </div>
      </div>

      {configVisualAberto && <PainelConfigVisual onClose={() => setConfigVisualAberto(false)} sessao={sessao} />}
    </main>
  );
}
