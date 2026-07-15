"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { chamarApi, getSessao } from "@/lib/sessao";

type AlertaNeg = { linha: number; marca: string; modelo: string; placa: string; desde: string; quemColocou: string; loja: string };
type AlertaCusto = { linha: number; marca: string; modelo: string; placa: string };
type AlertaVendedorAusente = { linha: number; marca: string; modelo: string; placa: string; loja: string; nomeAtual: string };
type AlertaConexao = {
  linha: number; tipo: string; resumo: string; lojaRequerente: string; lojaRequerida: string;
  solicitante: string; dataHora: string; requerenteConfirmou: boolean; requeridaConfirmou: boolean;
};

export function AlertasModal({ onClose }: { onClose: () => void }) {
  const sessao = getSessao();
  const podeVerFinanceiro = sessao?.cargo === "gestor" || sessao?.cargo === "gerente";

  const [negociacao, setNegociacao] = useState<AlertaNeg[]>([]);
  const [custo, setCusto] = useState<AlertaCusto[]>([]);
  const [vendedorAusente, setVendedorAusente] = useState<AlertaVendedorAusente[]>([]);
  const [nomesVendedor, setNomesVendedor] = useState<Record<number, string>>({});
  const [conexao, setConexao] = useState<AlertaConexao[]>([]);
  const [carregando, setCarregando] = useState(true);

  const carregar = () => {
    setCarregando(true);
    const chamadas: Promise<any>[] = [
      chamarApi({ acao: "rh_alertas_negociacao", gerente: sessao?.nome }),
      chamarApi({ acao: "evo_listar_alertas_conexao" }),
    ];
    if (podeVerFinanceiro) {
      chamadas.push(chamarApi({ acao: "rh_listar_estoque_mobile" }));
      chamadas.push(chamarApi({ acao: "rh_alertas_vendedor_ausente" }));
    }
    Promise.all(chamadas).then(([dataNeg, dataCnx, dataEst, dataVendAus]) => {
      if (dataNeg && dataNeg.ok) setNegociacao(dataNeg.alertas || []);
      if (dataCnx && dataCnx.ok) setConexao(dataCnx.alertas || []);
      if (dataEst && dataEst.ok) {
        setCusto((dataEst.motos || []).filter((m: any) => m.status?.includes("Vendido") && !m.valorEntrada));
      }
      if (dataVendAus && dataVendAus.ok) setVendedorAusente(dataVendAus.alertas || []);
      setCarregando(false);
    });
  };
  useEffect(() => { carregar(); }, []);

  const salvarVendedor = async (linha: number) => {
    const nome = (nomesVendedor[linha] || "").trim();
    if (!nome) return;
    await chamarApi({ acao: "rh_definir_vendedor_venda", linha, vendedorNome: nome, solicitante: sessao?.nome });
    carregar();
  };

  const confirmarNegociacao = async (linha: number, confirma: boolean) => {
    await chamarApi({ acao: "rh_responder_alerta", gerente: sessao?.nome, linha, confirmaNegociacao: confirma });
    carregar();
  };

  const confirmarConexao = async (linha: number, lado: "requerente" | "requerida") => {
    await chamarApi({ acao: "evo_responder_alerta_conexao", linha, lado, respondente: sessao?.nome });
    carregar();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
          <X size={20} />
        </button>
        <h2 className="text-2xl font-black mb-4">⚠️ <span className="text-accent">Alertas</span></h2>

        {carregando && <p className="text-muted-foreground text-sm">Carregando...</p>}

        {!carregando && (
          <div className="space-y-6">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-2">Negociação parada</p>
              {negociacao.length === 0 ? (
                <p className="text-sm text-green-400">✅ Nenhuma negociação parada.</p>
              ) : (
                <div className="space-y-2">
                  {negociacao.map((a) => (
                    <div key={a.linha} className="bg-white/5 border border-white/10 rounded-lg p-3">
                      <p className="text-sm font-semibold">{a.marca} {a.modelo} <span className="text-xs text-muted-foreground">({a.placa || "sem placa"})</span></p>
                      <p className="text-xs text-muted-foreground mb-2">Em negociação desde {a.desde} · por {a.quemColocou}</p>
                      <p className="text-xs mb-2">Essa moto ainda está em negociação?</p>
                      <div className="flex gap-2">
                        <button onClick={() => confirmarNegociacao(a.linha, true)} className="flex-1 h-7 rounded-lg bg-accent text-white text-xs font-semibold">✅ Sim</button>
                        <button onClick={() => confirmarNegociacao(a.linha, false)} className="flex-1 h-7 rounded-lg bg-white/5 border border-white/10 text-xs">❌ Não</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {podeVerFinanceiro && (
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-2">Custo faltando</p>
                {custo.length === 0 ? (
                  <p className="text-sm text-green-400">✅ Nenhuma pendência de custo.</p>
                ) : (
                  <div className="space-y-2">
                    {custo.map((m) => (
                      <div key={m.linha} className="bg-white/5 border border-white/10 rounded-lg p-3 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold">{m.marca} {m.modelo}</p>
                          <p className="text-xs text-muted-foreground">{m.placa || "sem placa"}</p>
                        </div>
                        <a href="/financeiro" className="text-xs text-accent underline shrink-0">Ir declarar</a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {podeVerFinanceiro && (
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-2">Vendedor não identificado</p>
                {vendedorAusente.length === 0 ? (
                  <p className="text-sm text-green-400">✅ Nenhuma pendência de vendedor.</p>
                ) : (
                  <div className="space-y-2">
                    {vendedorAusente.map((m) => (
                      <div key={m.linha} className="bg-white/5 border border-white/10 rounded-lg p-3">
                        <p className="text-sm font-semibold">{m.marca} {m.modelo} <span className="text-xs text-muted-foreground">({m.placa || "sem placa"}, {m.loja})</span></p>
                        <p className="text-xs text-orange-400 mb-2">Consta apenas "{m.nomeAtual}" (SDR) — falta o vendedor de verdade</p>
                        <div className="flex gap-2">
                          <input
                            placeholder="Nome do vendedor"
                            value={nomesVendedor[m.linha] || ""}
                            onChange={(e) => setNomesVendedor((n) => ({ ...n, [m.linha]: e.target.value }))}
                            className="flex-1 bg-white/5 border border-white/10 rounded-lg h-8 px-2 text-xs"
                          />
                          <button onClick={() => salvarVendedor(m.linha)} className="h-8 px-3 rounded-lg bg-accent text-white text-xs font-semibold">Salvar</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-2">Pendência de conexão</p>
              {conexao.length === 0 ? (
                <p className="text-sm text-green-400">✅ Nenhuma pendência de conexão.</p>
              ) : (
                <div className="space-y-2">
                  {conexao.map((a) => (
                    <div key={a.linha} className="bg-white/5 border border-white/10 rounded-lg p-3">
                      <p className="text-sm font-semibold">{a.tipo} — {a.resumo}</p>
                      <p className="text-xs text-muted-foreground mb-2">{a.lojaRequerente} → {a.lojaRequerida} · {a.solicitante} em {a.dataHora}</p>
                      <div className="flex gap-2">
                        {a.requerenteConfirmou ? (
                          <span className="flex-1 text-xs text-green-400 text-center py-1.5">✅ {a.lojaRequerente} confirmou</span>
                        ) : (
                          <button onClick={() => confirmarConexao(a.linha, "requerente")} className="flex-1 h-7 rounded-lg bg-accent/20 border border-accent/40 text-accent text-xs">Confirmar {a.lojaRequerente}</button>
                        )}
                        {a.requeridaConfirmou ? (
                          <span className="flex-1 text-xs text-green-400 text-center py-1.5">✅ {a.lojaRequerida} confirmou</span>
                        ) : (
                          <button onClick={() => confirmarConexao(a.linha, "requerida")} className="flex-1 h-7 rounded-lg bg-accent/20 border border-accent/40 text-accent text-xs">Confirmar {a.lojaRequerida}</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
