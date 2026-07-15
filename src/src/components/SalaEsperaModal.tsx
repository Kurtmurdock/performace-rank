"use client";

import { useEffect, useRef, useState } from "react";
import { X, Video } from "lucide-react";
import { chamarApi, getSessao } from "@/lib/sessao";

type Participante = { nome: string };

export function SalaEsperaModal({
  eventoId, titulo, dataISO, horario, onClose,
}: { eventoId: string; titulo: string; dataISO: string; horario: string; onClose: () => void }) {
  const sessao = getSessao();
  const ehGestor = sessao?.cargo === "gestor";

  const [contagem, setContagem] = useState("--:--:--");
  const [participantes, setParticipantes] = useState<Participante[]>([]);
  const [salaAberta, setSalaAberta] = useState(false);
  const [abrindo, setAbrindo] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Countdown até a data/hora do evento
    const alvo = new Date(`${dataISO}T${horario || "09:00"}:00`);
    const tick = () => {
      const diff = alvo.getTime() - Date.now();
      if (diff <= 0) { setContagem("00:00:00"); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      const f = (n: number) => n.toString().padStart(2, "0");
      setContagem(`${f(h)}:${f(m)}:${f(s)}`);
    };
    tick();
    countdownRef.current = setInterval(tick, 1000);

    const consultar = () => {
      chamarApi({ acao: "ev_sala_status", id: eventoId, solicitante: sessao?.nome }).then((data) => {
        if (data && data.ok) {
          setParticipantes(data.naEspera || []);
          if (data.salaAberta && data.linkJitsi) {
            setSalaAberta(true);
            window.open(data.linkJitsi, "_blank");
            onClose();
          }
        }
      });
    };
    consultar();
    pollingRef.current = setInterval(consultar, 10000);

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const abrirSala = async () => {
    setAbrindo(true);
    const data = await chamarApi({ acao: "ev_abrir_sala", id: eventoId, solicitante: sessao?.nome });
    if (data && data.ok && data.linkJitsi) {
      window.open(data.linkJitsi, "_blank");
      onClose();
    } else {
      setAbrindo(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-6">
      <button onClick={onClose} className="absolute top-6 right-6 text-white/60 hover:text-white">
        <X size={22} />
      </button>

      <p className="text-xs uppercase tracking-widest text-accent font-bold mb-2">Aguardando Início</p>
      <h2 className="text-2xl font-black text-white mb-1">{titulo}</h2>
      <p className="text-xs text-white/50 mb-6">{dataISO?.split("-").reverse().join("/")} às {horario}</p>

      <p className="text-5xl font-black tracking-widest text-white mb-8" style={{ fontVariantNumeric: "tabular-nums" }}>
        {contagem}
      </p>

      <div className="w-full max-w-sm bg-white/5 border border-white/10 rounded-xl p-4 mb-8">
        <p className="text-[10px] uppercase tracking-widest text-white/50 text-center mb-3">Participantes na Sala</p>
        {participantes.length === 0 ? (
          <p className="text-xs text-white/40 text-center py-2">Nenhum participante ainda.</p>
        ) : (
          <div className="space-y-1.5">
            {participantes.map((p, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-white/85">
                <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                {p.nome}
              </div>
            ))}
          </div>
        )}
      </div>

      {ehGestor ? (
        <button onClick={abrirSala} disabled={abrindo}
          className="h-12 px-8 rounded-lg bg-accent text-white font-bold text-sm flex items-center gap-2 disabled:opacity-60 hover:opacity-90 transition-opacity">
          <Video size={16} /> {abrindo ? "Abrindo..." : "Abrir Sala Agora"}
        </button>
      ) : (
        <p className="text-xs text-white/50 animate-pulse">⏳ Aguardando o gestor abrir a sala...</p>
      )}
    </div>
  );
}
