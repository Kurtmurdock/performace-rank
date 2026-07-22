"use client";

import { useEffect, useState } from "react";
import { Sidebar, TopBar, BellButton } from "@/components/Sidebar";
import { getSessao, chamarApi } from "@/lib/sessao";
import { ArrowLeft, Lock, Wallet, Check, Upload } from "lucide-react";

type Comissao = {
  role: string; nome: string; ehCabeca: boolean; valor: string; chavePix: string;
  pago: boolean; comprovanteUrl: string;
};
type Card = { linha: string; dataHora: string; destino: string; mensagem: string; comissoes: Comissao[] };

function formatarDataHora(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function rotuloRole(role: string, ehCabeca: boolean) {
  if (role === "vendedor") return ehCabeca ? "Vendedor (cabeça)" : "Vendedor";
  if (role === "half") return "Half";
  if (role === "gerente") return "Gerente";
  if (role === "sdr") return "SDR";
  return role;
}

function LinhaComissao({
  card, comissao, onAtualizado,
}: {
  card: Card;
  comissao: Comissao;
  onAtualizado: (novo: Comissao) => void;
}) {
  const [marcando, setMarcando] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const alternarPago = async () => {
    setMarcando(true);
    const novoPago = !comissao.pago;
    const data = await chamarApi({
      acao: "rh_marcar_comissao_paga", linha: card.linha, role: comissao.role, pago: novoPago,
      quemMarcou: JSON.parse(localStorage.getItem("performace_sessao") || "{}").nome,
    });
    if (data && data.ok) onAtualizado({ ...comissao, pago: novoPago });
    setMarcando(false);
  };

  const enviarComprovante = (file: File) => {
    setEnviando(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = (e.target?.result as string).split(",")[1];
      const data = await chamarApi({
        acao: "rh_upload_comprovante_comissao", linha: card.linha, role: comissao.role,
        arquivoBase64: base64, mimeType: file.type,
        quemMarcou: JSON.parse(localStorage.getItem("performace_sessao") || "{}").nome,
      });
      if (data && data.ok) onAtualizado({ ...comissao, comprovanteUrl: data.comprovanteUrl });
      setEnviando(false);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 bg-white/5 rounded-lg p-2.5">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold">{rotuloRole(comissao.role, comissao.ehCabeca)} — {comissao.nome}</p>
        <p className="text-[11px] text-muted-foreground">R$ {comissao.valor} · PIX: {comissao.chavePix || "—"}</p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {comissao.comprovanteUrl && (
          <a href={comissao.comprovanteUrl} target="_blank" rel="noopener" className="text-[11px] text-accent underline">Ver comprovante</a>
        )}
        <label className="h-8 px-2 rounded-lg bg-white/5 border border-white/10 text-[11px] flex items-center gap-1 cursor-pointer hover:border-accent">
          <Upload size={12} /> {enviando ? "..." : "Comprovante"}
          <input type="file" accept="image/*,.pdf" className="hidden"
            onChange={(e) => e.target.files?.[0] && enviarComprovante(e.target.files[0])} />
        </label>
        <button
          onClick={alternarPago}
          disabled={marcando}
          className={`h-8 px-3 rounded-lg text-[11px] font-semibold flex items-center gap-1 disabled:opacity-60 ${
            comissao.pago ? "bg-green-500/20 border border-green-500/40 text-green-400" : "bg-white/5 border border-white/10 text-muted-foreground hover:border-accent"
          }`}
        >
          <Check size={12} /> {comissao.pago ? "Pago" : "Marcar pago"}
        </button>
      </div>
    </div>
  );
}

export default function GerencialPage() {
  const sessao = getSessao();
  const podeAcessar = sessao?.cargo === "gerente" || sessao?.cargo === "gestor";
  const [cards, setCards] = useState<Card[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [filtroPago, setFiltroPago] = useState<"" | "pago" | "nao_pago">("");

  useEffect(() => {
    if (!podeAcessar) return;
    setCarregando(true);
    const lojaFiltro = sessao?.cargo === "gerente" ? sessao?.loja : "";
    chamarApi({ acao: "rh_listar_comissoes_gerencial", lojaFiltro, filtroPago, limite: 300 }).then((data) => {
      if (data && data.ok) setCards(data.cards || []);
      setCarregando(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [podeAcessar, filtroPago]);

  const atualizarComissao = (cardIdx: number, role: string, novo: Comissao) => {
    setCards((cs) => cs.map((c, i) => i === cardIdx
      ? { ...c, comissoes: c.comissoes.map((co) => co.role === role ? novo : co) }
      : c));
  };

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
          <p className="text-muted-foreground text-sm mb-4 flex items-center gap-1.5">
            <Wallet size={15} /> Comissão e PIX de cada fechamento de venda
            {sessao?.cargo === "gerente" && sessao?.loja ? ` — ${sessao.loja}` : ""}
          </p>

          <div className="flex gap-2 mb-6">
            <button onClick={() => setFiltroPago("")}
              className={`px-3 h-9 rounded-lg text-xs font-semibold ${filtroPago === "" ? "bg-accent text-white" : "bg-white/5 border border-white/10 text-muted-foreground"}`}>
              Todas
            </button>
            <button onClick={() => setFiltroPago("pago")}
              className={`px-3 h-9 rounded-lg text-xs font-semibold ${filtroPago === "pago" ? "bg-green-500 text-white" : "bg-white/5 border border-white/10 text-muted-foreground"}`}>
              ✅ Pago
            </button>
            <button onClick={() => setFiltroPago("nao_pago")}
              className={`px-3 h-9 rounded-lg text-xs font-semibold ${filtroPago === "nao_pago" ? "bg-accent text-white" : "bg-white/5 border border-white/10 text-muted-foreground"}`}>
              ❌ Não Pago
            </button>
          </div>

          {carregando && <p className="text-muted-foreground">Carregando...</p>}
          {!carregando && cards.length === 0 && (
            <p className="text-muted-foreground text-sm">Nenhuma venda encontrada com esse filtro.</p>
          )}

          <div className="space-y-3">
            {!carregando && cards.map((card, idx) => (
              <div key={idx} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-accent">{card.destino}</span>
                  <span className="text-[11px] text-muted-foreground">{formatarDataHora(card.dataHora)}</span>
                </div>
                <div className="space-y-2">
                  {card.comissoes.map((comissao) => (
                    <LinhaComissao
                      key={comissao.role}
                      card={card}
                      comissao={comissao}
                      onAtualizado={(novo) => atualizarComissao(idx, comissao.role, novo)}
                    />
                  ))}
                  {card.comissoes.length === 0 && (
                    <p className="text-xs text-muted-foreground">Não consegui identificar as comissões nessa mensagem.</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
