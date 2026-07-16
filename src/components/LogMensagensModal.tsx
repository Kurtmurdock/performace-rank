"use client";

import { useEffect, useState } from "react";
import { X, Inbox } from "lucide-react";
import { chamarApi } from "@/lib/sessao";

type MensagemLog = { dataHora: string; tipo: string; destino: string; mensagem: string; linha: string };

const CAIXAS = [
  "Informação da Venda",
  "Fechamento de Venda (Comissão/PIX)",
  "Venda Cancelada",
  "Aviso de Documentação",
];

function formatarDataHora(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export function LogMensagensModal({ onClose }: { onClose: () => void }) {
  const [caixaAtiva, setCaixaAtiva] = useState(CAIXAS[0]);
  const [mensagens, setMensagens] = useState<MensagemLog[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [expandido, setExpandido] = useState<number | null>(null);

  useEffect(() => {
    chamarApi({ acao: "rh_listar_log_mensagens", tipo: caixaAtiva, limite: 200 }).then((data) => {
      if (data && data.ok) setMensagens(data.mensagens || []);
      setCarregando(false);
    });
  }, [caixaAtiva]);

  const trocarCaixa = (caixa: string) => {
    setCaixaAtiva(caixa);
    setCarregando(true);
    setExpandido(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col relative">
        <div className="p-6 pb-3 flex items-start justify-between shrink-0">
          <div>
            <h2 className="text-lg font-black flex items-center gap-2">
              <Inbox size={18} className="text-accent" /> Mensagens <span className="text-accent">Enviadas</span>
            </h2>
            <p className="text-[11px] text-muted-foreground mt-1">
              Cópia de cada mensagem gravada no site, com data/hora — mesmo que o WhatsApp falhe, fica aqui.
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground shrink-0">
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5 px-6 pb-3 shrink-0">
          {CAIXAS.map((c) => (
            <button
              key={c}
              onClick={() => trocarCaixa(c)}
              className={`px-2.5 h-8 rounded-lg text-xs font-semibold ${caixaAtiva === c ? "bg-accent text-white" : "bg-white/5 border border-white/10 text-muted-foreground hover:border-accent"}`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-2">
          {carregando && <p className="text-sm text-muted-foreground">Carregando...</p>}
          {!carregando && mensagens.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhuma mensagem registrada nessa caixa ainda.</p>
          )}
          {!carregando && mensagens.map((m, i) => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-lg p-3">
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
              {m.linha && <p className="text-[10px] text-muted-foreground/60 mt-1">Linha da moto: {m.linha}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
