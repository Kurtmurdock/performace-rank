"use client";

import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { Sidebar, TopBar, BellButton } from "@/components/Sidebar";
import { getSessao } from "@/lib/sessao";
import { ArrowLeft, Upload } from "lucide-react";

const CAT_MAP: Record<string, string | null> = {
  "RECEITAS OPERACIONAIS": "_receita",
  "PAGAMENTO DE FORNECEDOR": "_fornecedor",
  "ENTRADA": "_entrada",
  "COMISSOES E PREMIOS": "_comissao",
  "MARKETING E PUBLICIDADE": "Marketing",
  "DESPESAS ADMINISTRATIVAS": "Sistema",
  "AUTOCERTO": "Sistema",
  "INTERNET": "Internet",
  "AJUDA DE CUSTO": "Pessoal",
  "AJUDA DE CUSTO+DESPESA ADMINISTRATIVA": "Pessoal",
  "DESPESAS COM PESSOAL": "Pessoal",
  "DESPESAS COM O ESTABELECIMENTO": "Estabelecimento",
  "DESPESAS NAO IDENTIFICADAS": "Outras",
  "MANUTENÇÃO AR CONDICIONADO": "Outras",
  "DESPESAS FINANCEIRAS": "Financeiro",
  "VALE SOCIOS": "Vale/Socios",
  "GRT": "Impostos/Taxas",
  "EMPLACAMENTO": "Impostos/Taxas",
  "OUTROS IMPOSTOS": "Impostos/Taxas",
  "VEICULO CUSTO OPERACIONAL": "Frete/Custo Op.",
  "DEVOLUÇÃO": "Outras",
  "CONTAS TRANSITORIAS": null,
};

const CONFIG_LOJA: Record<string, { meta: number; resp: string }> = {
  VISION: { meta: 10, resp: "Luiz Fernando" },
  ATLANTICA: { meta: 8, resp: "Karyn" },
  SALINAS: { meta: 6, resp: "Robson" },
  CONFORT: { meta: 4, resp: "Caio" },
  UNIAO: { meta: 6, resp: "Marlon" },
  IMPERIO: { meta: 2, resp: "Sergio/Branco" },
};
const LOJAS_ORDEM = ["VISION", "ATLANTICA", "SALINAS", "CONFORT", "UNIAO", "IMPERIO"];
const DIST_KEY = "DISTRIBUIÇAO";

type Lancamento = { data: string; desc: string; cat: string; grupo: string; valor: number };
type LojaFin = {
  loja: string; receita: number; fornecedor: number; entrada: number; comissao: number;
  lb: number; despesas: Record<string, number>; despesas_total: number; resultado: number;
  vendas: number; lancamentos: Lancamento[];
};

function brl(v: number) {
  return Math.abs(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function normCat(s: string) {
  if (!s) return "";
  return s.replace(/\s*\(CONTA MATRIZ\)/gi, "").trim().toUpperCase();
}
function normBanco(s: string) {
  if (!s) return "";
  const b = s.trim().toUpperCase();
  if (b === "CFT AUTO" || b === "CONFORT AUTO") return "CONFORT";
  return b;
}
function parseDataCel(v: any): Date | null {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (typeof v === "number") return new Date((v - 25569) * 86400 * 1000);
  if (typeof v === "string") {
    const m = v.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (m) return new Date(`${m[3]}-${m[2]}-${m[1]}`);
    return new Date(v);
  }
  return null;
}

function processarXLSX(rawRows: any[], dataFiltro: string): Record<string, LojaFin> | null {
  let headerRow = -1;
  for (let r = 0; r < Math.min(rawRows.length, 10); r++) {
    const row = (rawRows[r] || []).map((c: any) => String(c).trim());
    if (row.includes("Banco") && row.includes("Valor")) { headerRow = r; break; }
  }
  if (headerRow < 0) return null;
  const headers = rawRows[headerRow].map((c: any) => String(c).trim());
  const iCol = (k: string) => headers.indexOf(k);
  const COL = {
    data: iCol("Data Pagamento"), desc: iCol("Descrição"), cat: iCol("Categoria"),
    banco: iCol("Banco"), valor: iCol("Valor"),
  };
  const limite = new Date(dataFiltro + "T23:59:59");
  const lojas: Record<string, LojaFin> = {};

  for (let r = headerRow + 2; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!row || row.every((c: any) => c === "")) continue;
    const banco = normBanco(String(row[COL.banco] || ""));
    if (!banco) continue;
    const cat = normCat(String(row[COL.cat] || ""));
    if (!cat) continue;
    const valor = parseFloat(String(row[COL.valor]).replace(",", ".")) || 0;
    if (valor === 0) continue;
    const dt = parseDataCel(row[COL.data]);
    if (dt && dt > limite) continue;
    if (!lojas[banco]) {
      lojas[banco] = { loja: banco, receita: 0, fornecedor: 0, entrada: 0, comissao: 0, lb: 0, despesas: {}, despesas_total: 0, resultado: 0, vendas: 0, lancamentos: [] };
    }
    const L = lojas[banco];
    const grupo = CAT_MAP[cat];
    if (grupo === null || grupo === undefined) continue;
    const dtStr = dt ? dt.toISOString().slice(0, 10) : "";
    const desc = String(row[COL.desc] || "").trim();
    L.lancamentos.push({ data: dtStr, desc, cat, grupo, valor });
    if (grupo === "_receita") { L.receita += valor; if (valor > 0) L.vendas++; }
    else if (grupo === "_fornecedor") { L.fornecedor += Math.abs(valor); }
    else if (grupo === "_entrada") { L.entrada += valor; }
    else if (grupo === "_comissao") { L.comissao += Math.abs(valor); }
    else if (grupo) { const v = Math.abs(valor); L.despesas[grupo] = (L.despesas[grupo] || 0) + v; L.despesas_total += v; }
  }
  Object.values(lojas).forEach((L) => {
    L.lb = L.receita - L.fornecedor + L.entrada;
    L.resultado = L.lb - L.comissao - L.despesas_total;
  });
  return lojas;
}

function statusLoja(d: LojaFin) {
  if (d.resultado < 0) return { cor: "border-red-500/40 bg-red-500/5", badge: "CRÍTICO", badgeCor: "bg-red-500/20 text-red-400" };
  const cfg = CONFIG_LOJA[d.loja];
  const pct = cfg?.meta ? d.vendas / cfg.meta : 1;
  if (pct < 0.5) return { cor: "border-red-500/40 bg-red-500/5", badge: "ALERTA", badgeCor: "bg-red-500/20 text-red-400" };
  if (pct < 0.8) return { cor: "border-yellow-500/40 bg-yellow-500/5", badge: "ATENÇÃO", badgeCor: "bg-yellow-500/20 text-yellow-400" };
  return { cor: "border-green-500/30 bg-green-500/5", badge: "OK", badgeCor: "bg-green-500/20 text-green-400" };
}

export default function FinanceiroCompletoPage() {
  const sessao = getSessao();
  const [dadosLojas, setDadosLojas] = useState<Record<string, LojaFin>>({});
  const [dataFiltro, setDataFiltro] = useState(new Date().toISOString().slice(0, 10));
  const [statusUpload, setStatusUpload] = useState("");
  const [lojaDetalhe, setLojaDetalhe] = useState<string | null>(null);

  const [passivoItens, setPassivoItens] = useState([
    { nome: "Central Lagos", valor: 0 },
    { nome: "Empréstimo Cléber/JMP", valor: 0 },
    { nome: "Prolabore União", valor: 0 },
  ]);
  const passivoTotal = passivoItens.reduce((s, i) => s + i.valor, 0);

  const processarArquivos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const arquivos = Array.from(e.target.files || []);
    if (!arquivos.length) return;
    setStatusUpload("Processando...");
    const tags: string[] = [];
    const novosDados = { ...dadosLojas };
    for (const arquivo of arquivos) {
      const ext = arquivo.name.split(".").pop()?.toLowerCase();
      if (!ext || !["xlsx", "xls"].includes(ext)) { tags.push(`⚠ ${arquivo.name} — use arquivo .xlsx`); continue; }
      try {
        const buf = await arquivo.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array", cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw: any[] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
        const lojas = processarXLSX(raw, dataFiltro);
        if (!lojas) { tags.push(`⚠ ${arquivo.name} — formato não reconhecido`); continue; }
        Object.assign(novosDados, lojas);
        tags.push(`✓ ${arquivo.name} — ${Object.keys(lojas).length} loja(s)`);
      } catch (err: any) {
        tags.push(`⚠ ${arquivo.name} — erro: ${err.message}`);
      }
    }
    setDadosLojas(novosDados);
    setStatusUpload(tags.join(" · "));
    e.target.value = "";
  };

  const lojas = useMemo(() => LOJAS_ORDEM.map((k) => dadosLojas[k]).filter(Boolean), [dadosLojas]);
  const dist = dadosLojas[DIST_KEY];

  const totalLB = lojas.reduce((s, d) => s + d.lb, 0);
  const totalRes = lojas.reduce((s, d) => s + d.resultado, 0);
  const totalVnd = lojas.reduce((s, d) => s + d.vendas, 0);
  const totalCom = lojas.reduce((s, d) => s + d.comissao, 0);
  const totalDesp = lojas.reduce((s, d) => s + d.despesas_total, 0) + (dist?.despesas_total || 0);
  const lojasOrdenadas = [...lojas].sort((a, b) => b.resultado - a.resultado);
  const lojaDetalheData = lojaDetalhe ? dadosLojas[lojaDetalhe] : null;

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
          <a href="/financeiro" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-accent mb-4"><ArrowLeft size={15} /> Voltar ao Financeiro</a>
          <h1 className="text-3xl md:text-4xl font-black mb-6">📊 Painel Financeiro <span className="text-accent">Completo</span></h1>

          {!lojaDetalhe ? (
            <>
              <div className="flex flex-wrap items-end gap-3 mb-6">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Período até</label>
                  <input type="date" value={dataFiltro} onChange={(e) => setDataFiltro(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg h-9 px-3 text-sm" />
                </div>
                <label className="flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-lg px-4 h-9 cursor-pointer hover:border-accent transition-colors text-sm">
                  <Upload size={14} /> Carregar .xlsx do Wallie
                  <input type="file" accept=".xlsx,.xls" multiple className="hidden" onChange={processarArquivos} />
                </label>
              </div>
              {statusUpload && <p className="text-xs text-muted-foreground mb-6">{statusUpload}</p>}

              {lojas.length === 0 && !dist ? (
                <div className="text-center py-16">
                  <p className="text-4xl mb-2">📊</p>
                  <p className="font-bold">AGUARDANDO DADOS</p>
                  <p className="text-muted-foreground text-sm">Carregue o arquivo .xlsx do Wallie para gerar o painel</p>
                </div>
              ) : (
                <>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
                    <div className="bg-card border border-border rounded-xl p-3">
                      <p className="text-[10px] uppercase text-muted-foreground">Lucro Bruto Total</p>
                      <p className={`text-xl font-black ${totalLB >= 0 ? "text-green-400" : "text-red-400"}`}>R$ {brl(totalLB)}</p>
                      <p className="text-[10px] text-muted-foreground">{totalVnd} vendas no período</p>
                    </div>
                    <div className="bg-card border border-border rounded-xl p-3">
                      <p className="text-[10px] uppercase text-muted-foreground">Comissões de Venda</p>
                      <p className="text-xl font-black text-yellow-400">-R$ {brl(totalCom)}</p>
                      <p className="text-[10px] text-muted-foreground">{totalLB > 0 ? ((totalCom / totalLB) * 100).toFixed(1) : "—"}% do lucro bruto</p>
                    </div>
                    <div className="bg-card border border-border rounded-xl p-3">
                      <p className="text-[10px] uppercase text-muted-foreground">Despesas Operacionais</p>
                      <p className="text-xl font-black text-red-400">-R$ {brl(totalDesp)}</p>
                      <p className="text-[10px] text-muted-foreground">Todas as lojas + distribuição</p>
                    </div>
                    <div className="bg-card border border-border rounded-xl p-3">
                      <p className="text-[10px] uppercase text-muted-foreground">Resultado Líquido</p>
                      <p className={`text-xl font-black ${totalRes >= 0 ? "text-green-400" : "text-red-400"}`}>R$ {brl(totalRes)}</p>
                      <p className="text-[10px] text-muted-foreground">{totalLB > 0 ? ((totalRes / totalLB) * 100).toFixed(1) : "—"}% do LB convertido</p>
                    </div>
                    <div className="bg-card border border-border rounded-xl p-3">
                      <p className="text-[10px] uppercase text-muted-foreground">Passivo Líquido</p>
                      <p className="text-xl font-black text-red-400">-R$ {brl(passivoTotal)}</p>
                      <p className="text-[10px] text-muted-foreground">Editável abaixo</p>
                    </div>
                  </div>

                  <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-2">Resultado por loja</p>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
                    {lojasOrdenadas.map((d) => {
                      const st = statusLoja(d);
                      const cfg = CONFIG_LOJA[d.loja];
                      const despOrdenadas = Object.entries(d.despesas).sort((a, b) => b[1] - a[1]);
                      return (
                        <button key={d.loja} onClick={() => setLojaDetalhe(d.loja)} className={`text-left rounded-xl border p-4 ${st.cor} hover:brightness-125 transition`}>
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <p className="font-black">{d.loja}</p>
                              <p className="text-[10px] text-muted-foreground">{cfg?.resp || ""}</p>
                            </div>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${st.badgeCor}`}>{st.badge}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                            <div><p className="text-muted-foreground">Lucro Bruto</p><p className={`font-bold ${d.lb >= 0 ? "text-green-400" : "text-red-400"}`}>R$ {brl(d.lb)}</p></div>
                            <div><p className="text-muted-foreground">Resultado</p><p className={`font-bold ${d.resultado >= 0 ? "text-green-400" : "text-red-400"}`}>R$ {brl(d.resultado)}</p></div>
                            <div><p className="text-muted-foreground">Vendas / Meta</p><p className="font-bold">{d.vendas} / {cfg?.meta ?? "—"}</p></div>
                            <div><p className="text-muted-foreground">Despesas Op.</p><p className="font-bold text-red-400">-R$ {brl(d.despesas_total)}</p></div>
                          </div>
                          {despOrdenadas.slice(0, 3).map(([k, v]) => (
                            <div key={k} className="flex justify-between text-[11px] text-muted-foreground"><span>{k}</span><span>-R$ {brl(v)}</span></div>
                          ))}
                        </button>
                      );
                    })}
                  </div>

                  {dist && (
                    <>
                      <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-2">Conta Matriz — Custos Centrais</p>
                      <button onClick={() => setLojaDetalhe(DIST_KEY)} className="w-full text-left rounded-xl border border-yellow-500/40 bg-yellow-500/5 p-4 mb-6 hover:brightness-125 transition">
                        <p className="font-black">DISTRIBUIÇÃO</p>
                        <p className="text-xs text-red-400 font-bold">-R$ {brl(dist.despesas_total)}</p>
                      </button>
                    </>
                  )}
                </>
              )}

              <div className="border-t border-white/10 pt-4">
                <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-2">Passivo Líquido (editável)</p>
                <div className="space-y-2 max-w-md">
                  {passivoItens.map((item, i) => (
                    <div key={i} className="flex gap-2">
                      <input value={item.nome} onChange={(e) => setPassivoItens((its) => its.map((it, idx) => (idx === i ? { ...it, nome: e.target.value } : it)))}
                        className="flex-1 bg-white/5 border border-white/10 rounded-lg h-8 px-2 text-xs" />
                      <input type="number" value={item.valor} onChange={(e) => setPassivoItens((its) => its.map((it, idx) => (idx === i ? { ...it, valor: parseFloat(e.target.value) || 0 } : it)))}
                        className="w-28 bg-white/5 border border-white/10 rounded-lg h-8 px-2 text-xs" />
                    </div>
                  ))}
                  <button onClick={() => setPassivoItens((its) => [...its, { nome: "", valor: 0 }])} className="text-xs text-accent underline">+ adicionar item</button>
                </div>
              </div>
            </>
          ) : (
            lojaDetalheData && (
              <div>
                <button onClick={() => setLojaDetalhe(null)} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-accent mb-4">
                  <ArrowLeft size={13} /> Voltar
                </button>
                <h2 className="text-2xl font-black mb-1">{lojaDetalheData.loja === DIST_KEY ? "CONTA MATRIZ" : lojaDetalheData.loja}</h2>
                <p className="text-muted-foreground text-sm mb-4">{CONFIG_LOJA[lojaDetalheData.loja]?.resp || ""}</p>

                <div className="grid sm:grid-cols-4 gap-3 mb-6">
                  <div className="bg-card border border-border rounded-lg p-3"><p className="text-[10px] text-muted-foreground">Receita Bruta</p><p className="font-bold text-green-400">R$ {brl(lojaDetalheData.receita)}</p></div>
                  <div className="bg-card border border-border rounded-lg p-3"><p className="text-[10px] text-muted-foreground">(-) Fornecedor</p><p className="font-bold text-red-400">-R$ {brl(lojaDetalheData.fornecedor)}</p></div>
                  <div className="bg-card border border-border rounded-lg p-3"><p className="text-[10px] text-muted-foreground">Lucro Bruto</p><p className="font-bold text-green-400">R$ {brl(lojaDetalheData.lb)}</p></div>
                  <div className="bg-card border border-border rounded-lg p-3"><p className="text-[10px] text-muted-foreground">Resultado</p><p className={`font-bold ${lojaDetalheData.resultado >= 0 ? "text-green-400" : "text-red-400"}`}>R$ {brl(lojaDetalheData.resultado)}</p></div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-2">Receitas / Entradas</p>
                    <div className="space-y-1">
                      {lojaDetalheData.lancamentos.filter((l) => l.grupo === "_receita" || l.grupo === "_entrada").map((l, i) => (
                        <div key={i} className="flex justify-between text-xs border-b border-white/5 pb-1">
                          <span>{l.desc} <span className="text-muted-foreground">({l.grupo === "_receita" ? "Receita" : "Entrada"})</span></span>
                          <span className="text-green-400">R$ {brl(l.valor)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-2">Comissões / Despesas</p>
                    <div className="space-y-1">
                      {lojaDetalheData.lancamentos.filter((l) => l.grupo === "_comissao" || (l.grupo && !l.grupo.startsWith("_"))).map((l, i) => (
                        <div key={i} className="flex justify-between text-xs border-b border-white/5 pb-1">
                          <span>{l.desc} <span className="text-muted-foreground">({l.grupo === "_comissao" ? "Comissão" : l.grupo})</span></span>
                          <span className="text-red-400">-R$ {brl(l.valor)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </main>
  );
}
