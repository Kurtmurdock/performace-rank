"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { chamarApi, getSessao } from "@/lib/sessao";

type Pendencia = { nome: string; loja: string; fase: "atraso" | "falta" };
type EventoHistorico = { texto: string; hora: string };

export function NotificacoesModal({ onClose }: { onClose: () => void }) {
  const sessao = getSessao();
  const podeVerPendencias = sessao?.cargo === "gestor" || sessao?.cargo === "gerente";

  const [pendencias, setPendencias] = useState<Pendencia[]>([]);
  const [historico, setHistorico] = useState<EventoHistorico[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [justificativas, setJustificativas] = useState<Record<string, string>>({});

  const carregar = () => {
    setCarregando(true);
    const chamadas: Promise<any>[] = [
      chamarApi({ acao: "rh_tarja_noticias" }),
    ];
    if (podeVerPendencias) {
      chamadas.push(chamarApi({ acao: "rh_alertas_vendedores_atraso", gerente: sessao?.nome }));
    }
    Promise.all(chamadas).then(([dataHist, dataPend]) => {
      if (dataHist && dataHist.ok) setHistorico(dataHist.eventos || []);
      if (dataPend && dataPend.ok) setPendencias(dataPend.alertas || []);
      setCarregando(false);
    });
  };
  useEffect(() => { carregar(); }, []);

  const responder = async (nomeVendedor: string, faltou: boolean) => {
    let justificativa = "";
    if (faltou) justificativa = justificativas[nomeVendedor] || "";
    await chamarApi({
      acao: "rh_responder_falta",
      gerente: sessao?.nome,
      nomeVendedor,
      faltou,
      justificativa,
    });
    carregar();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl max-w-md w-full max-h-[85vh] overflow-y-auto p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
          <X size={20} />
        </button>
        <h2 className="text-2xl font-black mb-1">🔔 <span className="text-accent">Notificações</span></h2>
        <p className="text-xs text-muted-foreground mb-4">Pendências e tudo que está acontecendo no sistema</p>

        {carregando && <p className="text-muted-foreground text-sm">Carregando...</p>}

        {!carregando && podeVerPendencias && (
          <div className="mb-6">
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-2">Pendências agora</p>
            {pendencias.length === 0 ? (
              <p className="text-sm text-green-400">✅ Nenhuma pendência de login agora.</p>
            ) : (
              <div className="space-y-2">
                {pendencias.map((p) => (
                  <div key={p.nome} className="bg-white/5 border border-white/10 rounded-lg p-3">
                    <p className="text-sm font-semibold">{p.nome} <span className="text-xs text-muted-foreground">({p.loja})</span></p>
                    <p className="text-xs text-muted-foreground mb-2">
                      {p.fase === "falta" ? "Ainda sem login — faltou hoje?" : "Ainda sem login hoje"}
                    </p>
                    {p.fase === "falta" && (
                      <>
                        <input
                          placeholder="Justificativa (se faltou)"
                          value={justificativas[p.nome] || ""}
                          onChange={(e) => setJustificativas((j) => ({ ...j, [p.nome]: e.target.value }))}
                          className="w-full bg-white/5 border border-white/10 rounded-lg h-8 px-2 text-xs mb-2"
                        />
                        <div className="flex gap-2">
                          <button onClick={() => responder(p.nome, true)} className="flex-1 h-7 rounded-lg bg-accent text-white text-xs font-semibold">✅ Faltou</button>
                          <button onClick={() => responder(p.nome, false)} className="flex-1 h-7 rounded-lg bg-white/5 border border-white/10 text-xs">❌ Não faltou</button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!carregando && (
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-2">Histórico recente</p>
            {historico.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma novidade nas últimas 24 horas.</p>
            ) : (
              <div className="space-y-1.5">
                {historico.map((e, i) => (
                  <div key={i} className="flex items-start justify-between gap-2 text-sm border-b border-white/5 pb-1.5">
                    <span dangerouslySetInnerHTML={{ __html: e.texto }} />
                    <span className="text-xs text-muted-foreground shrink-0">{e.hora}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
