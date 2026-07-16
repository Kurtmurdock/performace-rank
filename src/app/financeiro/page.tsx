"use client";

import { useEffect, useMemo, useState } from "react";
import { Sidebar, TopBar, BellButton } from "@/components/Sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { chamarApi, getSessao } from "@/lib/sessao";
import { ArrowLeft, Palette, Lock } from "lucide-react";
import { PainelConfigVisual } from "@/components/PainelConfigVisual";
import { AdministrativoModal } from "@/components/AdministrativoModal";
import { useConfigVisual } from "@/lib/useConfigVisual";

type Moto = {
  linha: number; marca: string; modelo: string; placa: string; chao: string; status: string;
  valorEntrada?: string; vendaEntrada?: string; vendaFinanciamento?: string;
  comissaoVendedor?: string; comissaoGerente?: string;
};

function lojaDaVenda(status: string, chao: string) {
  const m = status.match(/Vendido,\s*(.+)/);
  return m ? m[1].trim() : chao || "—";
}

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function FinanceiroPage() {
  const sessao = getSessao();
  const ehGestor = sessao?.cargo === "gestor";
  const [desbloqueado, setDesbloqueado] = useState(false);
  const [senhaInput, setSenhaInput] = useState("");
  const [erroSenha, setErroSenha] = useState("");
  const [validandoSenha, setValidandoSenha] = useState(false);
  const [motos, setMotos] = useState<Moto[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [configVisualAberto, setConfigVisualAberto] = useState(false);
  const [administrativoAberto, setAdministrativoAberto] = useState(false);
  const [filtroLoja, setFiltroLoja] = useState("");
  const [custosEditados, setCustosEditados] = useState<Record<number, string>>({});
  const [salvando, setSalvando] = useState<number | null>(null);
  const [msgPorLinha, setMsgPorLinha] = useState<Record<number, string>>({});

  const carregar = () => {
    chamarApi({ acao: "rh_listar_estoque_mobile" }).then((data) => {
      if (data && data.ok) {
        setMotos((data.motos || []).filter((m: Moto) => m.status?.includes("Vendido")));
      }
      setCarregando(false);
    });
  };
  useEffect(() => { if (desbloqueado) carregar(); }, [desbloqueado]);

  const tentarDesbloquear = async () => {
    if (!senhaInput.trim()) return;
    setValidandoSenha(true);
    setErroSenha("");
    const data = await chamarApi({ acao: "rh_validar_senha_master", senhaMaster: senhaInput.trim() });
    if (data && data.ok) {
      setDesbloqueado(true);
    } else {
      setErroSenha("❌ Senha incorreta.");
    }
    setValidandoSenha(false);
  };

  const lojas = useMemo(() => {
    const set = new Set(motos.map((m) => lojaDaVenda(m.status, m.chao)));
    return Array.from(set).sort();
  }, [motos]);

  const motosFiltradas = useMemo(() => {
    if (!filtroLoja) return motos;
    return motos.filter((m) => lojaDaVenda(m.status, m.chao) === filtroLoja);
  }, [motos, filtroLoja]);

  const salvarCusto = async (linha: number) => {
    const raw = (custosEditados[linha] || "").trim();
    const custo = parseFloat(raw.replace(/[R$\s.]/g, "").replace(",", "."));
    if (isNaN(custo)) {
      setMsgPorLinha((m) => ({ ...m, [linha]: "❌ Valor inválido" }));
      return;
    }
    setSalvando(linha);
    const data = await chamarApi({ acao: "rh_salvar_custo_moto", linha, custo });
    if (data && data.ok) {
      setMotos((ms) => ms.map((m) => (m.linha === linha ? { ...m, valorEntrada: String(custo) } : m)));
      setMsgPorLinha((m) => ({ ...m, [linha]: "✅ Salvo" }));
    } else {
      setMsgPorLinha((m) => ({ ...m, [linha]: "❌ " + ((data && data.erro) || "Erro ao salvar") }));
    }
    setSalvando(null);
  };

  const semCustoCount = motos.filter((m) => !m.valorEntrada).length;

  if (!ehGestor) {
    return (
      <main className="min-h-screen bg-background text-foreground flex items-center justify-center px-4">
        <div className="max-w-sm text-center space-y-3">
          <Lock size={32} className="mx-auto text-muted-foreground" />
          <h1 className="text-xl font-black">Acesso restrito</h1>
          <p className="text-muted-foreground text-sm">
            O Painel Financeiro é visível só para gestores.
          </p>
          <a href="/" className="inline-block text-sm text-accent underline">← Voltar ao Rank</a>
        </div>
      </main>
    );
  }

  if (!desbloqueado) {
    return (
      <main className="min-h-screen bg-background text-foreground flex items-center justify-center px-4">
        <div className="max-w-sm w-full space-y-3 text-center">
          <Lock size={32} className="mx-auto text-accent" />
          <h1 className="text-xl font-black">Painel Financeiro</h1>
          <p className="text-muted-foreground text-sm">Digite a senha master pra entrar.</p>
          <input
            type="password"
            value={senhaInput}
            onChange={(e) => setSenhaInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && tentarDesbloquear()}
            placeholder="Senha master"
            autoComplete="off"
            className="w-full bg-white/5 border border-white/10 rounded-lg h-11 px-3 text-sm text-center outline-none focus:border-accent"
          />
          {erroSenha && <p className="text-accent text-xs">{erroSenha}</p>}
          <button
            onClick={tentarDesbloquear}
            disabled={validandoSenha}
            className="w-full h-11 rounded-lg bg-accent text-white font-bold text-sm disabled:opacity-60"
          >
            {validandoSenha ? "Verificando..." : "Entrar"}
          </button>
          <a href="/" className="inline-block text-sm text-muted-foreground hover:text-accent underline">← Voltar ao Rank</a>
        </div>
      </main>
    );
  }

  const configVisual = useConfigVisual("financeiro");

  return (
    <main
      className="min-h-screen bg-background text-foreground px-4 py-8 md:px-10 relative"
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
        <Sidebar nomeUsuario={sessao?.nome} />
        <div className="flex-1">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <a href="/" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-accent"><ArrowLeft size={15} /> Voltar ao Rank</a>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setConfigVisualAberto(true)} className="h-10 px-4 rounded-lg bg-white/5 border border-white/10 text-sm font-semibold flex items-center gap-2 hover:border-accent transition-colors">
                <Palette size={15} /> Configurações Visuais
              </button>
              <a href="/disparo-geral" className="h-10 px-4 rounded-lg bg-white/5 border border-white/10 text-sm font-semibold flex items-center hover:border-accent transition-colors">
                📤 Disparo Geral
              </a>
              <a href="/financeiro-completo" className="h-10 px-4 rounded-lg bg-white/5 border border-white/10 text-sm font-semibold flex items-center hover:border-accent transition-colors">
                📊 Painel Completo
              </a>
              <button onClick={() => setAdministrativoAberto(true)} className="h-10 px-4 rounded-lg bg-white/5 border border-yellow-500/40 text-yellow-400 text-sm font-semibold flex items-center gap-2 hover:border-yellow-400 transition-colors">
                🔒 Administrativo
              </button>
            </div>
          </div>
          <h1 className="text-3xl md:text-4xl font-black mb-2">Painel Financeiro</h1>
          <p className="text-muted-foreground text-sm mb-1">Fechamento de Vendas — todas as vendas do mês</p>
          {semCustoCount > 0 && (
            <p className="text-orange-400 text-xs mb-4">⚠️ {semCustoCount} venda(s) sem custo declarado ainda</p>
          )}

          <div className="flex flex-wrap gap-2 mb-6">
            <button onClick={() => setFiltroLoja("")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${!filtroLoja ? "bg-accent text-white" : "bg-white/5 text-muted-foreground"}`}>
              Todas as lojas
            </button>
            {lojas.map((l) => (
              <button key={l} onClick={() => setFiltroLoja(l)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${filtroLoja === l ? "bg-accent text-white" : "bg-white/5 text-muted-foreground"}`}>
                {l}
              </button>
            ))}
          </div>

          {carregando && <p className="text-muted-foreground">Carregando...</p>}

          <div className="space-y-3">
            {motosFiltradas.map((m) => {
              const custoAtual = m.valorEntrada ? parseFloat(m.valorEntrada) : null;
              const totalVenda = (parseFloat(m.vendaEntrada || "0") || 0) + (parseFloat(m.vendaFinanciamento || "0") || 0);
              const comissoes = (parseFloat(m.comissaoVendedor || "0") || 0) + (parseFloat(m.comissaoGerente || "0") || 0);
              const lucro = custoAtual !== null ? totalVenda - custoAtual - comissoes : null;

              return (
                <Card key={m.linha} className="border-border">
                  <CardContent className="py-4 flex flex-col md:flex-row md:items-center gap-3 justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold">{m.marca} {m.modelo}</p>
                      <p className="text-xs text-muted-foreground">
                        {m.placa || "Sem placa"} · {lojaDaVenda(m.status, m.chao)} · Linha {m.linha}
                      </p>
                    </div>

                    {custoAtual !== null ? (
                      <div className="text-right shrink-0">
                        <p className={`text-sm font-bold ${lucro! >= 0 ? "text-green-400" : "text-accent"}`}>
                          Lucro da Casa: {brl(lucro!)}
                        </p>
                        <p className="text-xs text-muted-foreground">Custo: {brl(custoAtual)}</p>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 shrink-0">
                        <input
                          placeholder="R$ 0,00"
                          value={custosEditados[m.linha] || ""}
                          onChange={(e) => setCustosEditados((c) => ({ ...c, [m.linha]: e.target.value }))}
                          className="w-28 bg-white/5 border border-white/10 rounded-lg h-9 px-2 text-sm"
                        />
                        <button
                          onClick={() => salvarCusto(m.linha)}
                          disabled={salvando === m.linha}
                          className="h-9 px-3 rounded-lg bg-accent text-white text-xs font-semibold disabled:opacity-60"
                        >
                          {salvando === m.linha ? "..." : "Salvar"}
                        </button>
                      </div>
                    )}
                    {msgPorLinha[m.linha] && (
                      <p className="text-xs text-muted-foreground shrink-0">{msgPorLinha[m.linha]}</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
            {!carregando && motosFiltradas.length === 0 && (
              <p className="text-muted-foreground text-sm">Nenhuma venda encontrada.</p>
            )}
          </div>
        </div>
      </div>

      {configVisualAberto && <PainelConfigVisual onClose={() => setConfigVisualAberto(false)} sessao={sessao} />}
      {administrativoAberto && <AdministrativoModal onClose={() => setAdministrativoAberto(false)} />}

    </main>
  );
}
