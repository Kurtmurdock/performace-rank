"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Sidebar, TopBar, BellButton } from "@/components/Sidebar";
import { chamarApi, getSessao } from "@/lib/sessao";
import { ArrowLeft, Plus, Search } from "lucide-react";
import { ClienteWizardModal } from "@/components/ClienteWizardModal";
import { ClienteDetalheModal, type Cliente } from "@/components/ClienteBusca";

type ClienteResumo = { nome: string; cpf: string; telefone?: string };

export default function ClientesPage() {
  const sessao = getSessao();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState("");
  const [resultados, setResultados] = useState<ClienteResumo[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [cadastrarAberto, setCadastrarAberto] = useState(false);
  const [cpfDetalhe, setCpfDetalhe] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abriuPorParametro = useRef(false);

  useEffect(() => {
    if (!abriuPorParametro.current && searchParams.get("novo") === "1") {
      setCadastrarAberto(true);
      abriuPorParametro.current = true;
    }
  }, [searchParams]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 3) {
      setResultados([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setBuscando(true);
      const data = await chamarApi({ acao: "rh_cliente_buscar", query });
      if (data && data.ok) setResultados(data.clientes || []);
      setBuscando(false);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  return (
    <main className="min-h-screen bg-background text-foreground px-4 py-8 md:px-10">
      <BellButton />
      <TopBar />
      <div className="flex flex-col md:flex-row gap-8">
        <Sidebar nomeUsuario={sessao?.nome} />
        <div className="flex-1">
          <div className="flex items-center justify-between mb-4">
            <a href="/" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-accent"><ArrowLeft size={15} /> Voltar ao Rank</a>
            <button onClick={() => setCadastrarAberto(true)} className="h-10 px-4 rounded-lg bg-accent text-white font-bold text-sm flex items-center gap-2">
              <Plus size={15} /> Cadastrar Cliente
            </button>
          </div>
          <h1 className="text-3xl md:text-4xl font-black mb-1">Cadastro de <span className="text-accent">Clientes</span></h1>
          <p className="text-muted-foreground text-sm mb-6">Busque por nome ou CPF, ou cadastre um cliente novo.</p>

          <div className="relative max-w-md mb-6">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nome ou CPF (mín. 3 letras)"
              className="w-full bg-white/5 border border-white/10 focus:border-accent rounded-lg h-10 pl-9 pr-3 text-sm outline-none"
            />
          </div>

          {buscando && <p className="text-muted-foreground text-sm">Buscando...</p>}
          {!buscando && query.trim().length >= 3 && resultados.length === 0 && (
            <p className="text-muted-foreground text-sm">Nenhum cliente encontrado — use o botão &quot;Cadastrar Cliente&quot; acima.</p>
          )}
          {query.trim().length < 3 && (
            <p className="text-muted-foreground text-sm">Digite ao menos 3 letras do nome ou do CPF pra buscar.</p>
          )}

          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3 mt-3">
            {resultados.map((r) => (
              <button
                key={r.cpf}
                onClick={() => setCpfDetalhe(r.cpf)}
                className="text-left bg-card border border-border rounded-xl p-4 hover:border-accent transition-colors"
              >
                <p className="font-bold">{r.nome}</p>
                <p className="text-xs text-muted-foreground">CPF: {r.cpf}</p>
                {r.telefone && <p className="text-xs text-muted-foreground">{r.telefone}</p>}
              </button>
            ))}
          </div>
        </div>
      </div>

      {cadastrarAberto && (
        <ClienteWizardModal
          onClose={() => setCadastrarAberto(false)}
          onCadastrado={(c) => setCpfDetalhe(c.cpf)}
        />
      )}
      {cpfDetalhe && (
        <ClienteDetalheModal cpf={cpfDetalhe} onClose={() => setCpfDetalhe(null)} />
      )}
    </main>
  );
}
