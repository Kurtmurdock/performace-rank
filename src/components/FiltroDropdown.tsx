"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

export function FiltroDropdown({
  label, opcoes, selecionados, onChange,
}: {
  label: string;
  opcoes: string[];
  selecionados: string[];
  onChange: (novos: string[]) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fecharFora = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false);
    };
    document.addEventListener("mousedown", fecharFora);
    return () => document.removeEventListener("mousedown", fecharFora);
  }, []);

  const alternar = (opcao: string) => {
    if (selecionados.includes(opcao)) {
      onChange(selecionados.filter((o) => o !== opcao));
    } else {
      onChange([...selecionados, opcao]);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setAberto((a) => !a)}
        className={`flex items-center gap-1.5 h-9 px-3 rounded-lg border text-sm font-medium transition-colors ${
          selecionados.length > 0
            ? "border-accent bg-accent/10 text-accent"
            : "border-border bg-card text-foreground hover:border-accent/50"
        }`}
      >
        {label}
        {selecionados.length > 0 && (
          <span className="bg-accent text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
            {selecionados.length}
          </span>
        )}
        <ChevronDown size={13} className={`transition-transform ${aberto ? "rotate-180" : ""}`} />
      </button>

      {aberto && (
        <div className="absolute z-20 mt-1 min-w-[200px] max-h-64 overflow-y-auto bg-card border border-border rounded-lg shadow-xl py-1">
          {opcoes.map((opcao) => {
            const marcado = selecionados.includes(opcao);
            return (
              <button
                key={opcao}
                onClick={() => alternar(opcao)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-white/5 text-left"
              >
                <span
                  className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                    marcado ? "bg-accent border-accent" : "border-border"
                  }`}
                >
                  {marcado && <Check size={11} className="text-white" />}
                </span>
                {opcao}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
