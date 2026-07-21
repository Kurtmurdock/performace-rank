"use client";

import { useEffect, useState } from "react";
import { Sidebar, TopBar, BellButton } from "@/components/Sidebar";
import { getSessao, chamarApi } from "@/lib/sessao";
import { ArrowLeft, Lock, Wallet } from "lucide-react";

type MensagemLog = { dataHora: string; tipo: string; destino: string; mensagem: string; linha: string };

function formatarDataHora(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export default function GerencialPage() {
  const sessao = getSessao();
  const podeAcessar = sessao?.cargo === "gerente" || sessao?.cargo === "gestor";
  const [mensagens, setMensagens] = useState<MensagemLog[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [expandido, setExpandido] = useState<number | null>(null);

  useEffect(() => {
    if (!podeAcessar) return;
    // Gestor vê tudo; gerente vê só as mensagens da própria loja (o destino
    // guarda "Comissões geral — Nome da Loja" desde que essa filtragem foi
    // implementada — mensagens antigas, de antes disso, não têm loja
    // gravada e por isso não aparecem pro gerente, só pro gestor).
    const lojaFiltro = sessao?.cargo === "gerente" ? sessao?.loja : "";
    chamarApi({ acao: "rh_listar_log_mensagens", tipo: "Fechamento de Venda (Comissão/PIX)", lojaFiltro, limite: 200 }).then((data) => {
      if (data && data.ok) setMensagens(data.mensagens || []);
      setCarregando(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [podeAcessar]);

  if (!podeAcessar) {
    return (
      <main className="min-h-screen bg-background text-foreground flex items-center justify-center px-4">
        <div className="max-w-sm text-center space-y-3">
          <Lock size={32} className="mx-auto text-muted-foreground" />
          <h1 className="text-xl font-black">Acesso restrito</h1>
          <p className="text-muted-foreground text-sm">A página Gerencial é visível só para gerentes e gestores.</p>
          <a href="/" className="inline-block text-sm text-accent underline">← Voltar ao Rank</a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground px-4 py-8 md:px-10">
      <BellButton />
      <TopBar />
      <div className="flex flex-col md:flex-row gap-8">
        <Sidebar nomeUsuario={sessao?.nome} />
        <div className="flex-1 max-w-2xl">
          <a href="/" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-accent mb-4">
            <ArrowLeft size={15} /> Voltar ao Rank
          </a>
          <h1 className="text-3xl md:text-4xl font-black mb-2">
            <span className="text-accent">Gerencial</span>
          </h1>
          <p className="text-muted-foreground text-sm mb-6 flex items-center gap-1.5">
            <Wallet size={15} /> Comissão e PIX de cada fechamento de venda
            {sessao?.cargo === "gerente" && sessao?.loja ? ` — ${sessao.loja}` : ""}
          </p>

          {carregando && <p className="text-muted-foreground">Carregando...</p>}
          {!carregando && mensagens.length === 0 && (
            <p className="text-muted-foreground text-sm">Nenhuma mensagem registrada ainda.</p>
          )}

          <div className="space-y-2">
            {!carregando && mensagens.map((m, i) => (
              <div key={i} className="bg-card border border-border rounded-lg p-3">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-xs font-semibold text-accent">{m.destino}</span>
                  <span className="text-[11px] text-muted-foreground shrink-0">{formatarDataHora(m.dataHora)}</span>
                </div>
                <p className={`text-xs whitespace-pre-line text-muted-foreground ${expandido === i ? "" : "line-clamp-3"}`}>
                  {m.mensagem}
                </p>
                <button
                  onClick={() => setExpandido(expandido === i ? null : i)}
                  className="text-[11px] text-accent underline mt-1"
                >
                  {expandido === i ? "Ver menos" : "Ver mensagem completa"}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
