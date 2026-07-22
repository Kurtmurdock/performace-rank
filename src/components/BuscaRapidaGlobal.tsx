"use client";

import { useEffect, useState, useCallback } from "react";
import { Search, X } from "lucide-react";
import { chamarApi, getSessao } from "@/lib/sessao";

type ResultadoMoto = { linha: number; marca: string; modelo: string; placa: string; chassi: string; status: string };
type ResultadoCliente = { nome: string; cpf: string };

export function BuscaRapidaGlobal() {
  const sessao = getSessao();
  const [aberto, setAberto] = useState(false);
  const [query, setQuery] = useState("");
  const [motos, setMotos] = useState<ResultadoMoto[]>([]);
  const [clientes, setClientes] = useState<ResultadoCliente[]>([]);
  const [buscando, setBuscando] = useState(false);

  useEffect(() => {
    const ouvinte = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setAberto((a) => !a);
      }
      if (e.key === "Escape") setAberto(false);
    };
    window.addEventListener("keydown", ouvinte);
    return () => window.removeEventListener("keydown", ouvinte);
  }, []);

  const buscar = useCallback((termo: string) => {
    if (termo.trim().length < 3) { setMotos([]); setClientes([]); return; }
    setBuscando(true);
    Promise.all([
      chamarApi({ acao: "rh_listar_estoque_mobile" }),
      chamarApi({ acao: "rh_cliente_buscar", query: termo }),
    ]).then(([dataEstoque, dataClientes]) => {
      const termoLower = termo.toLowerCase();
      const todasMotos = (dataEstoque?.ok ? dataEstoque.motos || [] : []) as ResultadoMoto[];
      setMotos(todasMotos.filter((m) =>
        (m.placa || "").toLowerCase().includes(termoLower) ||
        (m.chassi || "").toLowerCase().includes(termoLower) ||
        (m.modelo || "").toLowerCase().includes(termoLower)
      ).slice(0, 8));
      setClientes((dataClientes?.ok ? dataClientes.clientes || [] : []).slice(0, 6));
      setBuscando(false);
    });
  }, []);

  useEffect(() => {
    const t = setTimeout(() => buscar(query), 300);
    return () => clearTimeout(t);
  }, [query, buscar]);

  if (!sessao || !aberto) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-start justify-center pt-24 p-4" onClick={() => setAberto(false)}>
      <div className="bg-card border border-border rounded-2xl max-w-lg w-full max-h-[70vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 p-4 border-b border-border shrink-0">
          <Search size={18} className="text-muted-foreground shrink-0" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por placa, chassi, modelo ou cliente..."
            className="flex-1 bg-transparent outline-none text-sm"
          />
          <button onClick={() => setAberto(false)} className="text-muted-foreground hover:text-foreground shrink-0"><X size={18} /></button>
        </div>

        <div className="overflow-y-auto p-2">
          {buscando && <p className="text-xs text-muted-foreground p-3">Buscando...</p>}
          {!buscando && query.trim().length >= 3 && motos.length === 0 && clientes.length === 0 && (
            <p className="text-xs text-muted-foreground p-3">Nada encontrado.</p>
          )}
          {!buscando && query.trim().length < 3 && (
            <p className="text-xs text-muted-foreground p-3">Digite ao menos 3 letras. <span className="opacity-60">Atalho: Ctrl+K</span></p>
          )}

          {motos.length > 0 && (
            <div className="mb-2">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground px-2 mb-1">Motos</p>
              {motos.map((m) => (
                <a key={m.linha} href={`/estoque?busca=${encodeURIComponent(m.placa || m.chassi)}`}
                  onClick={() => setAberto(false)}
                  className="flex items-center justify-between px-2 py-2 rounded-lg hover:bg-white/5 text-sm">
                  <span>{m.marca} {m.modelo} — {m.placa || "sem placa"}</span>
                  <span className="text-[10px] text-muted-foreground">{m.status}</span>
                </a>
              ))}
            </div>
          )}

          {clientes.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground px-2 mb-1">Clientes</p>
              {clientes.map((c) => (
                <a key={c.cpf} href={`/clientes?busca=${encodeURIComponent(c.cpf)}`}
                  onClick={() => setAberto(false)}
                  className="flex items-center justify-between px-2 py-2 rounded-lg hover:bg-white/5 text-sm">
                  <span>{c.nome}</span>
                  <span className="text-[10px] text-muted-foreground font-mono">{c.cpf}</span>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
