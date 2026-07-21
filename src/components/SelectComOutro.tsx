"use client";

import { useState } from "react";

// Select comum + opção "Outro" que revela um campo de texto livre. Usado
// nos dropdowns que precisam aceitar um valor fora da lista pré-definida
// (Marca, Fornecedor, Chão, Vendedor, etc.) sem travar quem tá cadastrando.
export function SelectComOutro({
  value, onChange, opcoes, className, placeholderVazio = "—",
}: {
  value: string;
  onChange: (v: string) => void;
  opcoes: string[];
  className?: string;
  placeholderVazio?: string;
}) {
  const [modoOutro, setModoOutro] = useState(!!value && value !== "" && !opcoes.includes(value));

  if (modoOutro) {
    return (
      <div className="flex gap-1.5">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Digite aqui"
          autoFocus
          className={className}
        />
        <button
          type="button"
          onClick={() => { setModoOutro(false); onChange(""); }}
          className="text-xs text-muted-foreground hover:text-accent shrink-0 px-1 whitespace-nowrap"
        >
          ↩ Voltar
        </button>
      </div>
    );
  }

  return (
    <select
      value={opcoes.includes(value) ? value : ""}
      onChange={(e) => {
        if (e.target.value === "__outro__") { setModoOutro(true); onChange(""); }
        else onChange(e.target.value);
      }}
      className={className}
    >
      <option value="">{placeholderVazio}</option>
      {opcoes.map((o) => <option key={o} value={o}>{o}</option>)}
      <option value="__outro__">✏️ Outro (digitar)</option>
    </select>
  );
}
