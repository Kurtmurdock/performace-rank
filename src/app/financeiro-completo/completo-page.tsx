"use client";

import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { Sidebar, TopBar, BellButton } from "@/components/Sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { getSessao, chamarApi } from "@/lib/sessao";
import { ArrowLeft, Lock, Upload, TrendingUp, TrendingDown } from "lucide-react";

// ── Mapa de categoria (Categoria da planilha → grupo interno) ──
// Portado do site antigo (index_50.html). Se sua planilha usar nomes de
// categoria diferentes desses, essas linhas caem em "outras" (ou são
// ignoradas, se o valor for null) — me avise os nomes reais que eu ajusto.
const CAT_MAP: Record<string, string | null> = {
  "RECEITAS OPERACIONAIS": "_receita",
  "PAGAMENTO DE FORNECEDOR": "_fornecedor",
  ENTRADA: "_entrada",
  "COMISSOES E PREMIOS": "_comissao",
  "MARKETING E PUBLICIDADE": "Marketing",
  "DESPESAS ADMINISTRATIVAS": "Sistema",
  AUTOCERTO: "Sistema",
  INTERNET: "Internet",
  "AJUDA DE CUSTO": "Pessoal",
  "AJUDA DE CUSTO+DESPESA ADMINISTRATIVA": "Pessoal",
  "DESPESAS COM PESSOAL": "Pessoal",
  "DESPESAS COM O ESTABELECIMENTO": "Estabelecimento",
  "DESPESAS NAO IDENTIFICADAS": "Outras",
  "MANUTENÇÃO AR CONDICIONADO": "Outras",
  "DESPESAS FINANCEIRAS": "Financeiro",
  "VALE SOCIOS": "Vale/Sócios",
  GRT: "Impostos/Taxas",
  EMPLACAMENTO: "Impostos/Taxas",
  "OUTROS IMPOSTOS": "Impostos/Taxas",
  "VEICULO CUSTO OPERACIONAL": "Frete/Custo Op.",
  DEVOLUÇÃO: "Outras",
  "CONTAS TRANSITORIAS": null,
};

// ── Código da planilha (coluna "Banco") → nome de exibição da loja ──
// ATUALIZADO pra lista completa (Lagos + Rio). ASSUNÇÃO: os códigos novos
// (Maré, Muralha, PQD, Rio das Ostras, Infinity, Baby Motos) seguem o
// mesmo padrão dos antigos (uma palavra maiúscula, sem acento) — ainda
// não testei contra uma planilha real com essas lojas. Se não bater,
// me manda os códigos exatos que aparecem na coluna "Banco" pra eu ajustar.
const LOJA_CODIGO_PARA_NOME: Record<string, string> = {
  SALINAS: "Salinas",
  ATLANTICA: "Atlântica",
  UNIAO: "União Motos",
  MARE: "Maré Motos",
  MURALHA: "Muralha",
  PQD: "PQD Motos",
  RIODASOSTRAS: "Rio das Ostras",
  VISION: "Vision",
  CONFORT: "Confort",
  IMPERIO: "Império",
  INFINITY: "Infinity",
  BABYMOTOS: "Baby Motos",
};
const CODIGOS_LOJA = Object.keys(LOJA_CODIGO_PARA_NOME);

type Lancamento = { data: string; desc: string; cat: string; grupo: string; valor: number };
type LojaFinanceira = {
  codigo: string;
  receita: number;
  fornecedor: number;
  entrada: number;
  comissao: number;
  lb: number;
  despesas: Record<string, number>;
  despesas_total: number;
  resultado: number;
  vendas: number;
  lancamentos: Lancamento[];
};

function normCat(s: string): string {
  if (!s) return "";
  return s.replace(/\s*\(CONTA MATRIZ\)/gi, "").trim().toUpperCase();
}

function normBanco(s: string): string {
  if (!s) return "";
  const b = s.trim().toUpperCase().replace(/\s+/g, "");
  if (b === "CFTAUTO" || b === "CONFORTAUTO") return "CONFORT";
  return b;
}

function parseDataCelula(v: unknown): Date | null {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (typeof v === "number") return new Date((v - 25569) * 86400 * 1000);
  if (typeof v === "string") {
    const m = v.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (m) return new Date(`${m[3]}-${m[2]}-${m[1]}`);
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

async function processarXLSX(file: File, dataFiltro: string): Promise<Record<string, LojaFinanceira> | null> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array", cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

  let headerRow = -1;
  for (let r = 0; r < Math.min(raw.length, 10); r++) {
    const row = (raw[r] as unknown[]).map((c) => String(c).trim());
    if (row.includes("Banco") && row.includes("Valor")) { headerRow = r; break; }
  }
  if (headerRow < 0) return null;

  const headers = (raw[headerRow] as unknown[]).map((c) => String(c).trim());
  const iCol = (k: string) => headers.indexOf(k);
  const COL = {
    data: iCol("Data Pagamento"), desc: iCol("Descrição"), cat: iCol("Categoria"),
    banco: iCol("Banco"), pago: iCol("Pago"), valor: iCol("Valor"),
  };

  const limite = dataFiltro ? new Date(dataFiltro + "T23:59:59") : null;
  const lojas: Record<string, LojaFinanceira> = {};

  for (let r = headerRow + 2; r < raw.length; r++) {
    const row = raw[r] as unknown[];
    if (!row || row.every((c) => c === "")) continue;
    const banco = normBanco(String(row[COL.banco] || ""));
    if (!banco) continue;
    const cat = normCat(String(row[COL.cat] || ""));
    if (!cat) continue;
    const valor = parseFloat(String(row[COL.valor]).replace(",", ".")) || 0;
    if (valor === 0) continue;
    const dt = parseDataCelula(row[COL.data]);
    if (dt && limite && dt > limite) continue;

    if (!lojas[banco]) {
      lojas[banco] = {
        codigo: banco, receita: 0, fornecedor: 0, entrada: 0, comissao: 0,
        lb: 0, despesas: {}, despesas_total: 0, resultado: 0, vendas: 0, lancamentos: [],
      };
    }
    const L = lojas[banco];
    const grupo = CAT_MAP[cat];
    if (grupo === null) continue;
    const dtStr = dt ? dt.toISOString().slice(0, 10) : "";
    const desc = String(row[COL.desc] || "").trim();
    L.lancamentos.push({ data: dtStr, desc, cat, grupo: grupo || "Outras", valor });

    if (grupo === "_receita") { L.receita += valor; if (valor > 0) L.vendas++; }
    else if (grupo === "_fornecedor") { L.fornecedor += Math.abs(valor); }
    else if (grupo === "_entrada") { L.entrada += valor; }
    else if (grupo === "_comissao") { L.comissao += Math.abs(valor); }
    else if (grupo) {
      const v = Math.abs(valor);
      L.despesas[grupo] = (L.despesas[grupo] || 0) + v;
      L.despesas_total += v;
    }
  }

  Object.values(lojas).forEach((L) => {
    L.lb = L.receita - L.fornecedor + L.entrada;
    L.resultado = L.lb - L.comissao - L.despesas_total;
  });

  return lojas;
}

function CardLoja({ nome, d }: { nome: string; d: LojaFinanceira }) {
  const critico = d.resultado < 0;
  const pctResultado = d.lb > 0 ? Math.min(100, Math.max(0, (d.resultado / d.lb) * 100)) : 0;
  const corBarra = pctResultado > 20 ? "bg-green-500" : pctResultado > 0 ? "bg-yellow-500" : "bg-accent";
  const despesasOrdenadas = Object.entries(d.despesas).sort((a, b) => b[1] - a[1]);
  const top4 = despesasOrdenadas.slice(0, 4);
  const restoVal = despesasOrdenadas.slice(4).reduce((s, [, v]) => s + v, 0);

  return (
    <Card className={`border-l-4 ${critico ? "border-l-accent" : "border-l-green-500"} border-t-border border-r-border border-b-border`}>
      <CardContent className="py-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="font-bold text-lg">{nome}</p>
          <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${critico ? "bg-accent/20 text-accent" : "bg-green-500/20 text-green-400"}`}>
            {critico ? "Crítico" : "OK"}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-[10px] uppercase text-muted-foreground">Lucro Bruto</p>
            <p className={`font-bold ${d.lb >= 0 ? "text-foreground" : "text-accent"}`}>{brl(d.lb)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-muted-foreground">Resultado</p>
            <p className={`font-bold ${d.resultado >= 0 ? "text-green-400" : "text-accent"}`}>{brl(d.resultado)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-muted-foreground">Vendas</p>
            <p className="font-bold">{d.vendas}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-muted-foreground">Despesas Op.</p>
            <p className="font-bold text-accent">-{brl(d.despesas_total)}</p>
          </div>
        </div>

        {d.lb > 0 && (
          <div>
            <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
              <span>% do Lucro Bruto convertido em Resultado</span>
              <span>{pctResultado.toFixed(1)}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div className={`h-full ${corBarra}`} style={{ width: `${Math.max(0, pctResultado)}%` }} />
            </div>
          </div>
        )}

        {top4.length > 0 && (
          <div className="space-y-1 pt-1 border-t border-white/5">
            {top4.map(([k, v]) => (
              <div key={k} className="flex justify-between text-xs">
                <span className="text-muted-foreground">{k}</span>
                <span className="text-accent">-{brl(v)}</span>
              </div>
            ))}
            {restoVal > 0.01 && (
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground/60">+ outras categorias</span>
                <span className="text-accent/60">-{brl(restoVal)}</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function FinanceiroCompletoPage() {
  const sessao = getSessao();
  const ehGestor = sessao?.cargo === "gestor";
  const [desbloqueado, setDesbloqueado] = useState(false);
  const [senhaInput, setSenhaInput] = useState("");
  const [erroSenha, setErroSenha] = useState("");
  const [validandoSenha, setValidandoSenha] = useState(false);

  const [dadosLojas, setDadosLojas] = useState<Record<string, LojaFinanceira>>({});
  const [dataFiltro, setDataFiltro] = useState("");
  const [processando, setProcessando] = useState(false);
  const [tagsArquivos, setTagsArquivos] = useState<{ nome: string; ok: boolean; msg: string }[]>([]);

  const tentarDesbloquear = async () => {
    if (!senhaInput.trim()) return;
    setValidandoSenha(true);
    setErroSenha("");
    const data = await chamarApi({ acao: "rh_validar_senha_master", senhaMaster: senhaInput.trim() });
    if (data && data.ok) setDesbloqueado(true);
    else setErroSenha("❌ Senha incorreta.");
    setValidandoSenha(false);
  };

  const processarArquivos = async (files: FileList) => {
    setProcessando(true);
    const novasTags: { nome: string; ok: boolean; msg: string }[] = [];
    const acumulado = { ...dadosLojas };
    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (ext !== "xlsx" && ext !== "xls") {
        novasTags.push({ nome: file.name, ok: false, msg: "use arquivo .xlsx" });
        continue;
      }
      try {
        const lojas = await processarXLSX(file, dataFiltro);
        if (!lojas) {
          novasTags.push({ nome: file.name, ok: false, msg: "formato não reconhecido (sem colunas Banco/Valor)" });
          continue;
        }
        Object.assign(acumulado, lojas);
        novasTags.push({ nome: file.name, ok: true, msg: `${Object.keys(lojas).length} loja(s)` });
      } catch (err) {
        novasTags.push({ nome: file.name, ok: false, msg: String(err) });
      }
    }
    setDadosLojas(acumulado);
    setTagsArquivos(novasTags);
    setProcessando(false);
  };

  const lojasReconhecidas = useMemo(() => {
    return CODIGOS_LOJA.map((cod) => ({ nome: LOJA_CODIGO_PARA_NOME[cod], d: dadosLojas[cod] }))
      .filter((x) => x.d)
      .sort((a, b) => b.d.resultado - a.d.resultado);
  }, [dadosLojas]);

  const naoReconhecidas = useMemo(() => {
    return Object.keys(dadosLojas).filter((k) => !CODIGOS_LOJA.includes(k));
  }, [dadosLojas]);

  const totais = useMemo(() => {
    const vals = lojasReconhecidas.map((x) => x.d);
    return {
      lb: vals.reduce((s, d) => s + d.lb, 0),
      resultado: vals.reduce((s, d) => s + d.resultado, 0),
      vendas: vals.reduce((s, d) => s + d.vendas, 0),
      comissao: vals.reduce((s, d) => s + d.comissao, 0),
      despesas: vals.reduce((s, d) => s + d.despesas_total, 0),
    };
  }, [lojasReconhecidas]);

  if (!ehGestor) {
    return (
      <main className="min-h-screen bg-background text-foreground flex items-center justify-center px-4">
        <div className="max-w-sm text-center space-y-3">
          <Lock size={32} className="mx-auto text-muted-foreground" />
          <h1 className="text-xl font-black">Acesso restrito</h1>
          <p className="text-muted-foreground text-sm">O Painel Completo é visível só para gestores.</p>
          <a href="/financeiro" className="inline-block text-sm text-accent underline">← Voltar ao Financeiro</a>
        </div>
      </main>
    );
  }

  if (!desbloqueado) {
    return (
      <main className="min-h-screen bg-background text-foreground flex items-center justify-center px-4">
        <div className="max-w-sm w-full space-y-3 text-center">
          <Lock size={32} className="mx-auto text-accent" />
          <h1 className="text-xl font-black">Painel Completo</h1>
          <p className="text-muted-foreground text-sm">Digite a senha master pra entrar.</p>
          <input
            type="password" value={senhaInput} onChange={(e) => setSenhaInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && tentarDesbloquear()}
            placeholder="Senha master" autoComplete="new-password" name="performace-financeirocompleto-senha"
            className="w-full bg-white/5 border border-white/10 rounded-lg h-11 px-3 text-sm text-center outline-none focus:border-accent"
          />
          {erroSenha && <p className="text-accent text-xs">{erroSenha}</p>}
          <button onClick={tentarDesbloquear} disabled={validandoSenha}
            className="w-full h-11 rounded-lg bg-accent text-white font-bold text-sm disabled:opacity-60">
            {validandoSenha ? "Verificando..." : "Entrar"}
          </button>
          <a href="/financeiro" className="inline-block text-sm text-muted-foreground hover:text-accent underline">← Voltar ao Financeiro</a>
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
        <div className="flex-1">
          <a href="/financeiro" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-accent mb-4">
            <ArrowLeft size={15} /> Voltar ao Financeiro
          </a>
          <h1 className="text-3xl md:text-4xl font-black mb-2">Painel <span className="text-accent">Completo</span></h1>
          <p className="text-muted-foreground text-sm mb-6">Resultado por loja — carregue a planilha de conciliação pra gerar o painel</p>

          <div className="bg-card border border-border rounded-xl p-5 mb-6 space-y-3">
            <div className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="flex-1 w-full">
                <label className="text-xs text-muted-foreground">Considerar lançamentos até (opcional)</label>
                <input type="date" value={dataFiltro} onChange={(e) => setDataFiltro(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg h-10 px-3 text-sm mt-1" />
              </div>
              <label className="flex items-center justify-center gap-2 h-10 px-4 rounded-lg bg-accent text-white text-sm font-semibold cursor-pointer hover:opacity-90 whitespace-nowrap">
                <Upload size={15} /> {processando ? "Processando..." : "Carregar planilha(s) .xlsx"}
                <input type="file" accept=".xlsx,.xls" multiple className="hidden"
                  onChange={(e) => e.target.files && processarArquivos(e.target.files)} />
              </label>
            </div>
            {tagsArquivos.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tagsArquivos.map((t, i) => (
                  <span key={i} className={`text-xs px-2 py-1 rounded ${t.ok ? "bg-green-500/10 text-green-400" : "bg-accent/10 text-accent"}`}>
                    {t.ok ? "✓" : "⚠"} {t.nome} — {t.msg}
                  </span>
                ))}
              </div>
            )}
          </div>

          {lojasReconhecidas.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <p className="text-lg mb-1">📊 Aguardando dados</p>
              <p className="text-sm">Carregue a planilha de conciliação pra gerar o painel.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
                <Card><CardContent className="py-4">
                  <p className="text-[10px] uppercase text-muted-foreground">Lucro Bruto Total</p>
                  <p className={`text-xl font-black ${totais.lb >= 0 ? "text-green-400" : "text-accent"}`}>{brl(totais.lb)}</p>
                  <p className="text-[10px] text-muted-foreground">{totais.vendas} vendas no período</p>
                </CardContent></Card>
                <Card><CardContent className="py-4">
                  <p className="text-[10px] uppercase text-muted-foreground">Comissões</p>
                  <p className="text-xl font-black text-yellow-400">-{brl(totais.comissao)}</p>
                  <p className="text-[10px] text-muted-foreground">{totais.lb > 0 ? ((totais.comissao / totais.lb) * 100).toFixed(1) : "—"}% do LB</p>
                </CardContent></Card>
                <Card><CardContent className="py-4">
                  <p className="text-[10px] uppercase text-muted-foreground">Despesas Operacionais</p>
                  <p className="text-xl font-black text-accent">-{brl(totais.despesas)}</p>
                  <p className="text-[10px] text-muted-foreground">Todas as lojas</p>
                </CardContent></Card>
                <Card><CardContent className="py-4">
                  <p className="text-[10px] uppercase text-muted-foreground">Resultado Líquido</p>
                  <p className={`text-xl font-black flex items-center gap-1 ${totais.resultado >= 0 ? "text-green-400" : "text-accent"}`}>
                    {totais.resultado >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />} {brl(totais.resultado)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{totais.lb > 0 ? ((totais.resultado / totais.lb) * 100).toFixed(1) : "—"}% do LB</p>
                </CardContent></Card>
              </div>

              <p className="text-xs font-bold uppercase text-accent mb-3">Resultado por Loja</p>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {lojasReconhecidas.map(({ nome, d }) => <CardLoja key={nome} nome={nome} d={d} />)}
              </div>
            </>
          )}

          {naoReconhecidas.length > 0 && (
            <p className="text-xs text-muted-foreground mt-6">
              ⚠️ Códigos na planilha não reconhecidos como loja (ignorados): {naoReconhecidas.join(", ")}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
