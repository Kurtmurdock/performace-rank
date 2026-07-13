"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Medal, RefreshCw, Clock } from "lucide-react";
import { Sidebar, TopBar, BellButton } from "@/components/Sidebar";
import { LeaderboardRankings, LeaderboardRankingItem } from "@/components/ui/leaderboard-rankings";
import { useConfigVisual } from "@/lib/useConfigVisual";
import { PremiacaoSemanalModal } from "@/components/PremiacaoSemanalModal";

const API_URL =
  "https://script.google.com/macros/s/AKfycbzRPeZO6kTKnnKD6KOtsBG3YuRbKMLUO9m0Nc4rUTb0ECG_UsW_qiwgzp1hc2q6meBUvQ/exec";
const REFRESH_MS = 30000;
const MESES = [
  "JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO",
  "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO",
];

type LojaRank = { name: string; sales: number };

const BANCOS: { nome: string; url: string }[] = [
  { nome: "BV", url: "https://parceiro.bv.com.br/ng-gpar-base-login/" },
  { nome: "Santander", url: "https://brpioneer.accenture.com/originacao-auto/login" },
  { nome: "Itaú", url: "https://credlineitau.com.br/simulator" },
  { nome: "Omni", url: "https://omni-mais.omni.com.br/app/rodas/visao-geral" },
  { nome: "PAN", url: "https://veiculos.bancopan.com.br/login" },
  { nome: "Honda", url: "https://vendadigital.bancohonda.com.br/" },
  { nome: "Auto Certo", url: "https://sistema.autocerto.com/auth/Login" },
];

function abrirBanco(url: string) {
  window.open(url, "_blank", "noopener");
}

function abrirTodosBancos() {
  // Navegadores tratam vários window.open() disparados juntos como
  // pop-up indesejado depois do primeiro — espaçar com um pequeno
  // delay contorna esse bloqueio (mesma lógica do site antigo).
  BANCOS.forEach((b, i) => {
    setTimeout(() => window.open(b.url, "_blank", "noopener"), i * 300);
  });
}

export default function RankDeVendas() {
  const [dados, setDados] = useState<LojaRank[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [relogio, setRelogio] = useState("");
  const [mes] = useState(new Date().getMonth());
  const [ano] = useState(new Date().getFullYear());
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState("");
  const [vendedores, setVendedores] = useState<LeaderboardRankingItem[]>([]);
  const [premiacaoAberta, setPremiacaoAberta] = useState(false);

  const carregarDados = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}?mes=${mes}&ano=${ano}`);
      const json = await res.json();
      let lista: any[] = Array.isArray(json)
        ? json
        : json.ranking || json.data || json.lojas || [];
      const normalizada: LojaRank[] = lista.map((item: any) => ({
        name: item.name || item.nome || item.loja || "—",
        sales: Number(item.sales ?? item.vendas ?? item.total ?? 0),
      }));
      normalizada.sort((a, b) => b.sales - a.sales);
      setDados(normalizada);
      setErro(null);
      setUltimaAtualizacao(new Date().toLocaleTimeString("pt-BR"));
    } catch {
      setErro("Erro na conexão com o servidor.");
    } finally {
      setCarregando(false);
    }

    // Ranking de vendedores (separado do ranking por loja)
    try {
      const resVend = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ acao: "rh_ranking_vendedores", mes, ano }),
      });
      const dataVend = await resVend.json();
      if (dataVend && dataVend.ok) {
        const lista: LeaderboardRankingItem[] = (dataVend.ranking || []).map(
          (v: any, i: number) => ({
            userId: v.nome,
            userName: v.nome,
            rank: i + 1,
            value: v.vendas || 0,
            avatarUrl: v.fotoPerfilUrl || null,
          })
        );
        setVendedores(lista);
      }
    } catch {
      // silencioso — ranking de vendedores é complementar
    }
  }, [mes, ano]);

  useEffect(() => {
    carregarDados();
    const intervalo = setInterval(carregarDados, REFRESH_MS);
    return () => clearInterval(intervalo);
  }, [carregarDados]);

  useEffect(() => {
    const tick = () => setRelogio(new Date().toLocaleTimeString("pt-BR"));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const total = dados.reduce((soma, d) => soma + (d.sales || 0), 0);
  const maiorValor = dados[0]?.sales || 1;

  const configVisual = useConfigVisual("rank");

  return (
    <main
      className="min-h-screen bg-background text-foreground px-4 py-8 md:px-10 relative overflow-hidden"
      style={{
        backgroundColor: configVisual?.corFundo || undefined,
        fontFamily: configVisual?.fonte || undefined,
        ["--accent" as any]: configVisual?.corBotao || undefined,
      }}
    >
      {configVisual?.midiaFundoUrl && (
        configVisual.midiaFundoTipo === "video" ? (
          <video src={configVisual.midiaFundoUrl} className="fixed inset-0 w-full h-full object-cover -z-10 opacity-30" autoPlay muted loop />
        ) : (
          <img src={configVisual.midiaFundoUrl} className="fixed inset-0 w-full h-full object-cover -z-10 opacity-30" alt="" />
        )
      )}
      <BellButton />
      <TopBar />
      <div className="flex flex-col md:flex-row gap-8">
        <Sidebar />
        <div className="flex-1">
      {/* Botão de Premiação Semanal — acima do Rank, não altera nada dele */}
      <div className="mb-4">
        <button
          onClick={() => setPremiacaoAberta(true)}
          className="h-11 px-5 rounded-lg bg-gradient-to-r from-yellow-600/20 to-yellow-500/10 border border-yellow-500/40 text-yellow-300 font-bold text-sm flex items-center gap-2 hover:border-yellow-400 transition-colors"
        >
          🏆 Premiação Semanal
        </button>
      </div>

      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8 fade-slide-up">
        <div>
          <p className="text-xs tracking-[0.3em] text-muted-foreground uppercase mb-1">
            Performace · {ano}
          </p>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight">
            RANK DE <span style={{ color: "var(--accent)" }}>VENDAS</span>
          </h1>
          <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase mt-1">
            Ranking de vendas por loja — {MESES[mes]}
          </p>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-xs text-muted-foreground uppercase tracking-widest">Total de vendas</p>
            <p className="text-5xl font-black" style={{ color: "var(--accent)" }}>{total}</p>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Clock size={16} />
            {relogio}
          </div>
        </div>
      </div>

      {/* Lista de lojas + ranking de vendedores à direita */}
      <div className="grid lg:grid-cols-[1fr_320px] gap-6 items-start">
      <div className="grid gap-3">
        {carregando && (
          <Card className="border-border">
            <CardContent className="py-8 text-center text-muted-foreground">
              Carregando...
            </CardContent>
          </Card>
        )}

        {erro && (
          <Card className="border-accent">
            <CardContent className="py-8 text-center" style={{ color: "var(--accent)" }}>
              {erro}
            </CardContent>
          </Card>
        )}

        {!carregando && !erro && dados.map((loja, i) => {
          const pct = Math.max(6, Math.round((loja.sales / maiorValor) * 100));
          return (
            <Card
              key={loja.name}
              className="border-border overflow-hidden relative fade-slide-up"
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <div
                className="absolute inset-y-0 left-0 rank-bar-fill"
                style={{
                  width: `${pct}%`,
                  background:
                    i === 0
                      ? "linear-gradient(90deg, rgba(255,215,0,0.22), rgba(255,215,0,0.04))"
                      : "linear-gradient(90deg, rgba(220,38,38,0.18), rgba(220,38,38,0.02))",
                }}
              />
              <CardContent className="relative flex items-center justify-between py-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 text-center">
                    {i === 0 && <Trophy size={22} style={{ color: "var(--gold)" }} />}
                    {i === 1 && <Medal size={20} className="text-slate-300" />}
                    {i === 2 && <Medal size={20} style={{ color: "#cd7f32" }} />}
                    {i > 2 && (
                      <span className="text-muted-foreground font-mono text-sm">#{i + 1}</span>
                    )}
                  </div>
                  <span className="font-bold text-lg uppercase tracking-wide">{loja.name}</span>
                </div>
                <div className="text-right">
                  <span className="text-3xl font-black">{loja.sales}</span>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest">vendas</p>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {!carregando && !erro && dados.length === 0 && (
          <Card className="border-border">
            <CardContent className="py-8 text-center text-muted-foreground">
              Nenhuma venda registrada em {MESES[mes]}.
            </CardContent>
          </Card>
        )}
      </div>

        {/* Ranking pessoal de vendedores */}
        <div className="fade-slide-up" style={{ animationDelay: "0.2s" }}>
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2 font-semibold">
            Top Vendedores
          </p>
          <LeaderboardRankings rankings={vendedores} />
        </div>
      </div>

      <div className="flex items-center gap-2 mt-8 text-xs text-muted-foreground">
        <RefreshCw size={12} />
        Atualizado às {ultimaAtualizacao || "—"} · atualiza a cada 30s
      </div>

      {/* Acesso rápido — bancos/financeiras */}
      <div className="mt-4">
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2 font-semibold">
          Acesso Rápido
        </p>
        <div className="flex flex-wrap gap-2">
          {BANCOS.map((banco) => (
            <button
              key={banco.nome}
              onClick={() => abrirBanco(banco.url)}
              className="px-4 py-2 rounded-lg bg-card border border-border text-sm font-medium hover:border-accent transition-colors"
            >
              {banco.nome}
            </button>
          ))}
          <button
            onClick={abrirTodosBancos}
            className="px-4 py-2 rounded-lg bg-card border border-yellow-500/40 text-yellow-400 text-sm font-medium hover:border-yellow-400 transition-colors"
          >
            Todos os Bancos
          </button>
        </div>
      </div>
        </div>
      </div>

      {premiacaoAberta && <PremiacaoSemanalModal onClose={() => setPremiacaoAberta(false)} />}
    </main>
  );
}
