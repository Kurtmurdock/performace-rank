"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { chamarApi, getSessao } from "@/lib/sessao";

type LojaProgresso = { nome: string; vendas: number };
type VendedorProgresso = { nome: string; vendas: number; fotoPerfilUrl?: string };

const META_LOJA = 10;
const META_VENDEDOR = 5;

function CartaoCarimbo({ v }: { v: VendedorProgresso }) {
  const completo = v.vendas >= META_VENDEDOR;
  return (
    <div
      className={`rounded-2xl p-4 ${
        completo
          ? "bg-gradient-to-br from-yellow-900/40 to-yellow-950 border-2 border-yellow-400"
          : "bg-gradient-to-br from-neutral-800 to-neutral-900 border border-yellow-800/40"
      }`}
    >
      <p className="text-sm font-semibold text-yellow-200">{v.nome}</p>
      <p className={`text-[11px] mb-3 ${completo ? "text-yellow-300" : "text-yellow-600/70"}`}>
        {completo ? "🎉 completou — R$1.000 garantido" : `${v.vendas} de ${META_VENDEDOR} vendas essa semana`}
      </p>
      <div className="flex gap-2">
        {Array.from({ length: META_VENDEDOR }).map((_, i) => (
          <div
            key={i}
            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs ${
              i < v.vendas ? "bg-yellow-400 text-yellow-950" : "border border-dashed border-yellow-800/50"
            }`}
          >
            {i < v.vendas ? "✓" : ""}
          </div>
        ))}
      </div>
    </div>
  );
}

export function PremiacaoSemanalModal({ onClose }: { onClose: () => void }) {
  const sessao = getSessao();
  const vePorLoja = sessao?.cargo === "gestor" || sessao?.cargo === "gerente";

  const [lojas, setLojas] = useState<LojaProgresso[]>([]);
  const [vendedores, setVendedores] = useState<VendedorProgresso[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    chamarApi({ acao: "rh_premiacao_semanal" }).then((data) => {
      if (data && data.ok) {
        setLojas(data.lojas || []);
        setVendedores((data.vendedores || []).filter((v: VendedorProgresso) => v.vendas > 0));
      }
      setCarregando(false);
    });
  }, []);

  // Mais completos em cima, mais vazios embaixo (quem bateu 5/5 primeiro)
  const vendedoresOrdenados = [...vendedores].sort((a, b) => b.vendas - a.vendas);

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-card border border-border rounded-2xl max-w-2xl w-full my-8 p-6 relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
          <X size={20} />
        </button>
        <h2 className="text-2xl font-black mb-4">🏆 <span className="text-accent">Premiação Semanal</span></h2>

        <div className="bg-white/5 border border-white/10 rounded-lg p-4 mb-6 text-sm text-muted-foreground space-y-1.5">
          <p>💰 Vendedor que faz <b className="text-foreground">5 vendas</b> na semana ganha <b className="text-accent">R$1.000</b>.</p>
          <p>📞 SDR que participa de <b className="text-foreground">5 vendas</b> na semana (por loja) ganha <b className="text-accent">R$250</b>.</p>
          <p>🏪 Loja que bate a meta de <b className="text-foreground">10 vendas</b> na semana também é premiada.</p>
          <p className="text-xs">Semana de segunda a domingo · reinicia toda segunda-feira às 4h da manhã.</p>
        </div>

        {carregando && <p className="text-muted-foreground text-sm">Carregando...</p>}

        {!carregando && vePorLoja && (
          <div className="mb-6">
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-2">Andamento por loja</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {lojas.map((l) => {
                const pct = Math.min(100, Math.round((l.vendas / META_LOJA) * 100));
                const bateu = l.vendas >= META_LOJA;
                return (
                  <div key={l.nome} className={`rounded-xl p-3 ${bateu ? "bg-yellow-500/10 border border-yellow-500/40" : "bg-white/5 border border-white/10"}`}>
                    <p className="text-sm font-semibold mb-2">
                      {l.nome} {bateu && <span className="text-yellow-400 text-xs">🏆</span>}
                    </p>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mb-1.5">
                      <div className={`h-full ${bateu ? "bg-yellow-400" : "bg-accent"}`} style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-xs text-muted-foreground">{l.vendas} / {META_LOJA} vendas</p>
                  </div>
                );
              })}
              {lojas.length === 0 && <p className="text-sm text-muted-foreground col-span-full">Nenhuma venda registrada essa semana ainda.</p>}
            </div>
          </div>
        )}

        {!carregando && (
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-2">Andamento por vendedor</p>
            {vendedoresOrdenados.length === 0 ? (
              <p className="text-sm text-muted-foreground">Ninguém vendeu essa semana ainda.</p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {vendedoresOrdenados.map((v) => (
                  <CartaoCarimbo key={v.nome} v={v} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
