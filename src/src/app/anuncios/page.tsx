"use client";

import { useEffect, useState } from "react";
import { Sidebar, TopBar, BellButton } from "@/components/Sidebar";
import { getSessao } from "@/lib/sessao";
import { ArrowLeft, RefreshCw } from "lucide-react";

const ADS_MONITOR_CSV = "https://docs.google.com/spreadsheets/d/1U8HsJgKZWfLs4KwSWqlI_KneSz0wnTIF1zTWm3TcULI/export?format=csv&gid=269633045";
const ADS_REFRESH_MS = 5 * 60 * 1000;

type LinhaAds = Record<string, string>;
type Campanha = { nome: string; novos: number; gasto: number };

function parseCSVads(text: string): LinhaAds[] {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.replace(/^"|"$/g, "").trim());
  const rows: LinhaAds[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.replace(/^"|"$/g, "").trim());
    const obj: LinhaAds = {};
    headers.forEach((h, j) => (obj[h] = cols[j] || ""));
    rows.push(obj);
  }
  return rows;
}

function moeda(v: number) {
  return "R$ " + v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function CardLoja({ r, periodo }: { r: LinhaAds; periodo: string }) {
  const nome = r["LOJA"] || "—";
  const novosMes = parseFloat(r["NOVOS_MES"]) || 0;
  const novosHoje = parseFloat(r["NOVOS_DIA"]) || 0;
  const cpmM = parseFloat(r["CPM_MES"]) || 0;
  const cpmD = parseFloat(r["CPM_DIA"]) || 0;
  const temErro = (r["ERRO"] || "").length > 0;
  let campanhas: Campanha[] = [];
  try { campanhas = JSON.parse(r["CAMPANHAS_JSON"] || "[]"); } catch {}

  const ehVendedores = campanhas.some((c) => /\/\d{3,4}$/.test(c.nome || ""));
  const maxLeads = Math.max(...campanhas.map((c) => c.novos || 0), 1);

  return (
    <div className={`rounded-xl border p-4 ${temErro ? "border-red-500/40 bg-red-500/5" : "border-border bg-card"}`}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="font-black">{nome}</p>
          <p className="text-[10px] text-muted-foreground">{periodo}</p>
        </div>
        <span className={`text-[10px] px-2 py-0.5 rounded-full ${temErro ? "bg-red-500/20 text-red-400" : "bg-green-500/20 text-green-400"}`}>
          {temErro ? "⚠ ERRO" : "● ATIVO"}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs mb-3">
        <div><p className="text-muted-foreground">Leads mês</p><p className="font-black text-yellow-400 text-lg">{novosMes}</p></div>
        <div><p className="text-muted-foreground">Leads hoje</p><p className="font-black text-green-400 text-lg">{novosHoje}</p></div>
        <div><p className="text-muted-foreground">CPM mês</p><p className="font-bold">{cpmM > 0 ? moeda(cpmM) : "—"}</p></div>
        <div><p className="text-muted-foreground">CPM hoje</p><p className="font-bold text-yellow-400">{cpmD > 0 ? moeda(cpmD) : "—"}</p></div>
      </div>

      {campanhas.length > 0 && (
        <div>
          <p className="text-[9px] uppercase tracking-widest text-muted-foreground mb-1.5">{ehVendedores ? "Ranking vendedores" : "Campanhas"}</p>
          {ehVendedores ? (
            <div className="space-y-1">
              {[...campanhas].sort((a, b) => (b.novos || 0) - (a.novos || 0)).map((c, i) => {
                const n = c.novos || 0;
                const cL = n > 0 ? (c.gasto || 0) / n : 0;
                const pct = Math.max(4, Math.round((n / maxLeads) * 100));
                const pos = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`;
                return (
                  <div key={i} className="flex items-center gap-2 text-[11px]">
                    <span className="w-4 text-center">{pos}</span>
                    <span className="w-16 truncate">{(c.nome || "").split("/")[0]}</span>
                    <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden"><div className="h-full bg-yellow-400" style={{ width: `${pct}%` }} /></div>
                    <span className="w-6 text-right">{n}</span>
                    <span className="w-14 text-right text-muted-foreground">{cL > 0 ? moeda(cL) : ""}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-1">
              {campanhas.slice(0, 5).map((c, i) => (
                <div key={i} className="flex justify-between text-[11px] border-b border-white/5 pb-1">
                  <span className="truncate max-w-[70%] text-muted-foreground">{c.nome || "—"}</span>
                  <span className={`font-bold ${(c.novos || 0) > 0 ? "text-yellow-400" : "text-muted-foreground"}`}>{c.novos || 0}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AnunciosPage() {
  const sessao = getSessao();
  const [linhas, setLinhas] = useState<LinhaAds[]>([]);
  const [periodo, setPeriodo] = useState("—");
  const [status, setStatus] = useState("Carregando...");
  const [erro, setErro] = useState("");

  const carregar = async () => {
    setStatus("Buscando...");
    try {
      const resp = await fetch(ADS_MONITOR_CSV + "&t=" + Date.now());
      if (!resp.ok) throw new Error("HTTP " + resp.status);
      const txt = await resp.text();
      const dados = parseCSVads(txt);
      const ctrl = dados.find((r) => r["LOJA"] === "ULTIMA_ATUALIZACAO") || {};
      setPeriodo(ctrl["STATUS"] || "—");
      setLinhas(dados.filter((r) => r["LOJA"] && r["LOJA"] !== "ULTIMA_ATUALIZACAO" && r["LOJA"] !== "LOJA"));
      setStatus("Ao vivo");
      setErro("");
    } catch (e: any) {
      setStatus("⚠ Erro");
      setErro(e.message || "Erro ao carregar.");
    }
  };

  useEffect(() => {
    carregar();
    const id = setInterval(carregar, ADS_REFRESH_MS);
    return () => clearInterval(id);
  }, []);

  const tNovosMes = linhas.reduce((s, r) => s + (parseFloat(r["NOVOS_MES"]) || 0), 0);
  const tNovosHoje = linhas.reduce((s, r) => s + (parseFloat(r["NOVOS_DIA"]) || 0), 0);
  const tGastoMes = linhas.reduce((s, r) => s + (parseFloat(r["GASTO_MES"]) || 0), 0);
  const tGastoDia = linhas.reduce((s, r) => s + (parseFloat(r["GASTO_DIA"]) || 0), 0);
  const cpmMes = tNovosMes > 0 ? tGastoMes / tNovosMes : 0;
  const cpmDia = tNovosHoje > 0 ? tGastoDia / tNovosHoje : 0;

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
        <div className="flex-1">
          <a href="/" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-accent mb-4"><ArrowLeft size={15} /> Voltar ao Rank</a>
          <div className="flex items-center justify-between mb-1">
            <h1 className="text-3xl md:text-4xl font-black">📣 Monitor de <span className="text-accent">Anúncios</span></h1>
            <button onClick={carregar} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-accent">
              <RefreshCw size={13} /> {status}
            </button>
          </div>
          <p className="text-muted-foreground text-sm mb-6">Período: {periodo}</p>

          {erro && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-4 text-sm text-red-400">
              Erro ao carregar: {erro}
            </div>
          )}

          {linhas.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-4xl mb-2">📡</p>
              <p className="font-bold">AGUARDANDO DADOS</p>
              <p className="text-muted-foreground text-sm">O script de anúncios ainda não rodou, ou as contas ainda não têm acesso autorizado.</p>
            </div>
          ) : (
            <>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                <div className="bg-card border border-border rounded-xl p-3"><p className="text-[10px] uppercase text-muted-foreground">Leads mês</p><p className="text-xl font-black text-yellow-400">{tNovosMes}</p></div>
                <div className="bg-card border border-border rounded-xl p-3"><p className="text-[10px] uppercase text-muted-foreground">Leads hoje</p><p className="text-xl font-black text-green-400">{tNovosHoje}</p></div>
                <div className="bg-card border border-border rounded-xl p-3"><p className="text-[10px] uppercase text-muted-foreground">CPM mês</p><p className="text-xl font-black">{cpmMes > 0 ? moeda(cpmMes) : "—"}</p></div>
                <div className="bg-card border border-border rounded-xl p-3"><p className="text-[10px] uppercase text-muted-foreground">CPM hoje</p><p className="text-xl font-black text-yellow-400">{cpmDia > 0 ? moeda(cpmDia) : "—"}</p></div>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {linhas.map((r, i) => <CardLoja key={i} r={r} periodo={periodo} />)}
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
