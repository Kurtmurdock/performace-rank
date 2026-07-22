"use client";

import { useEffect, useState } from "react";
import { Radio } from "lucide-react";
import { chamarApi, getSessao } from "@/lib/sessao";

type EventoTarja = { texto: string; hora: string };

const INTERVALO_MS = 45000;

// Barra fixa "⚡ AO VIVO" no topo, presente em todas as telas — cruza
// novos cadastros, mudanças de status/medalha/foto, novos funcionários
// e primeiro login do dia. Ação de backend: rh_tarja_noticias.
export function TarjaNoticias() {
  const [eventos, setEventos] = useState<EventoTarja[]>([]);
  const [carregado, setCarregado] = useState(false);
  const [erro, setErro] = useState("");
  const sessao = getSessao();

  useEffect(() => {
    if (!sessao) return;
    const carregar = () => {
      chamarApi({ acao: "rh_tarja_noticias" }).then((data) => {
        if (data && data.ok) {
          setEventos(data.eventos || []);
          setErro("");
        } else {
          // Diferencia "de verdade sem novidade" de "a chamada falhou" —
          // antes os dois casos ficavam idênticos na tela, escondendo erro.
          setErro((data && data.erro) || "Não consegui carregar (sem resposta do servidor).");
          console.error("rh_tarja_noticias falhou:", data);
        }
        setCarregado(true);
      }).catch((e) => {
        setErro("Erro de conexão: " + String(e));
        console.error("rh_tarja_noticias erro de rede:", e);
        setCarregado(true);
      });
    };
    carregar();
    const id = setInterval(carregar, INTERVALO_MS);
    return () => clearInterval(id);
  }, []);

  if (!sessao) return null;

  return (
    <div className="sticky top-0 left-0 right-0 z-40 h-8 bg-black/90 border-b border-accent/30 flex items-center overflow-hidden">
      <div className="shrink-0 h-full px-3 flex items-center gap-1.5 bg-accent text-white text-[10px] font-bold uppercase tracking-widest">
        <Radio size={11} className="animate-pulse" /> Ao Vivo
      </div>
      <div className="flex-1 overflow-hidden px-3 whitespace-nowrap text-ellipsis">
        {!carregado ? (
          <span className="text-[11px] text-white/50">Carregando novidades...</span>
        ) : erro ? (
          <span className="text-[11px] text-red-400">⚠️ {erro}</span>
        ) : eventos.length === 0 ? (
          <span className="text-[11px] text-white/50">📡 Nenhuma novidade nas últimas 24 horas.</span>
        ) : (
          <span className="text-[11px] text-white/80">
            {eventos.map((e, i) => (
              <span key={i}>
                {i > 0 && <span className="text-white/30 mx-3">•</span>}
                <span className="text-white/40 font-mono mr-1">{e.hora}</span>
                <span dangerouslySetInnerHTML={{ __html: e.texto }} />
              </span>
            ))}
          </span>
        )}
      </div>
    </div>
  );
}
