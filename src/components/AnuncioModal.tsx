"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { chamarApi, getSessao } from "@/lib/sessao";

export function AnuncioModal({ onClose }: { onClose: () => void }) {
  const sessao = getSessao();
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [msg, setMsg] = useState("");

  const enviar = async () => {
    if (!texto.trim()) { setMsg("❌ Digite o texto do anúncio."); return; }
    setEnviando(true);
    setMsg("");
    const data = await chamarApi({ acao: "rh_enviar_anuncio", texto: texto.trim(), autor: sessao?.nome });
    if (data && data.ok) {
      setMsg("✅ Anúncio enviado!");
      setTimeout(onClose, 800);
    } else {
      setMsg("❌ " + ((data && data.erro) || "Erro ao enviar."));
    }
    setEnviando(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl max-w-sm w-full p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
          <X size={20} />
        </button>
        <h2 className="text-xl font-black mb-1">📢 <span className="text-accent">Anúncio Geral</span></h2>
        <p className="text-xs text-muted-foreground mb-4">Aparece para todos na tela — tarja preta com letras amarelas</p>

        <input
          maxLength={120}
          placeholder="Digite o anúncio..."
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && enviar()}
          className="w-full bg-white/5 border border-white/10 rounded-lg h-10 px-3 text-sm mb-3"
        />

        {texto && (
          <div className="bg-black border-b-2 border-yellow-400 rounded-lg px-3 py-2 mb-3 text-center">
            <span className="text-yellow-300 font-bold text-xs">📢 {texto}</span>
          </div>
        )}

        {msg && <p className="text-sm mb-2">{msg}</p>}

        <button onClick={enviar} disabled={enviando} className="w-full h-10 rounded-lg bg-accent text-white font-bold text-sm disabled:opacity-60">
          {enviando ? "Enviando..." : "📢 Enviar para Todos"}
        </button>
      </div>
    </div>
  );
}
