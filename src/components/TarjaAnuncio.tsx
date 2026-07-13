"use client";

import { useEffect, useRef, useState } from "react";
import { chamarApi, getSessao } from "@/lib/sessao";

const INTERVALO_MS = 5000;

// Tarja preta/amarela global — aparece pra qualquer pessoa logada
// quando o gestor envia um anúncio geral. Fica no layout raiz, então
// funciona em qualquer página, igual a Tarja de Notícias.
export function TarjaAnuncio() {
  const [anuncio, setAnuncio] = useState<{ texto: string; autor: string } | null>(null);
  const ultimoIdRef = useRef<string>("");
  const sessao = getSessao();

  useEffect(() => {
    if (!sessao) return;
    const verificar = () => {
      chamarApi({ acao: "rh_obter_anuncio", ultimoId: ultimoIdRef.current }).then((data) => {
        if (data && data.ok && data.anuncio) {
          var a = data.anuncio;
          if (a.id !== ultimoIdRef.current) {
            ultimoIdRef.current = a.id;
            setAnuncio({ texto: a.texto, autor: a.autor });
            setTimeout(() => setAnuncio(null), 8000);
          }
        }
      });
    };
    verificar();
    const id = setInterval(verificar, INTERVALO_MS);
    return () => clearInterval(id);
  }, []);

  if (!anuncio) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] bg-black border-b-2 border-yellow-400 px-4 py-3 flex items-center justify-center gap-3 text-center">
      <span className="text-xl">📢</span>
      <span className="text-yellow-300 font-bold text-sm md:text-base">{anuncio.texto}</span>
      <span className="text-yellow-500/70 text-xs">— {anuncio.autor}</span>
    </div>
  );
}
