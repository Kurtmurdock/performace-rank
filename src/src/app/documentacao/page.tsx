"use client";

import { useEffect, useState } from "react";
import { Sidebar, TopBar, BellButton } from "@/components/Sidebar";
import { chamarApi, getSessao } from "@/lib/sessao";
import { ArrowLeft } from "lucide-react";

type Venda = { linha: number; nomeMoto: string; dataHora: string };

export default function DocumentacaoPage() {
  const sessao = getSessao();
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    chamarApi({ acao: "rh_documentacao_vendas_recentes" }).then((data) => {
      if (data && data.ok) setVendas(data.vendas || []);
      setCarregando(false);
    });
  }, []);

  if (!sessao) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background text-foreground px-4 text-center">
        <p className="text-muted-foreground">Sessão não encontrada. <a href="/login" className="text-accent underline">Fazer login</a></p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground px-4 py-8 md:px-10">
      <BellButton />
      <TopBar />
      <div className="flex flex-col md:flex-row gap-8">
        <Sidebar nomeUsuario={sessao?.nome} />
        <div className="flex-1 max-w-lg">
          <a href="/" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-accent mb-4"><ArrowLeft size={15} /> Voltar ao Rank</a>
          <h1 className="text-3xl md:text-4xl font-black mb-1">📄 <span className="text-accent">Documentação</span></h1>
          <p className="text-muted-foreground text-sm mb-6">Vendas das últimas 48 horas que precisam de acompanhamento</p>

          {carregando && <p className="text-muted-foreground text-sm">Carregando...</p>}
          {!carregando && vendas.length === 0 && (
            <p className="text-muted-foreground text-sm">Nenhuma venda nas últimas 48 horas.</p>
          )}

          <div className="space-y-3">
            {vendas.map((v) => (
              <div key={v.linha + v.dataHora} className="bg-card border border-border rounded-xl p-4">
                <p className="font-bold text-sm mb-1">🏁 {v.nomeMoto}</p>
                <p className="text-sm text-muted-foreground mb-2">Olá Sabrina, essa moto foi vendida. Obrigado pelo empenho!</p>
                <p className="text-xs text-muted-foreground">{v.dataHora}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
