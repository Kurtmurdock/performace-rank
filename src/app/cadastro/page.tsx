"use client";

import { useEffect, useRef, useState } from "react";
import { Sidebar, TopBar, BellButton } from "@/components/Sidebar";
import { chamarApi, getSessao } from "@/lib/sessao";
import { ArrowLeft, Plus, Search, Users, Bike } from "lucide-react";
import { ClienteWizardModal } from "@/components/ClienteWizardModal";
import { ClienteDetalheModal } from "@/components/ClienteBusca";
import { CadastrarMotoModal } from "@/components/CadastrarMotoModal";

type ClienteResumo = { nome: string; cpf: string; telefone?: string };
type MotoResumo = { linha: number; marca: string; modelo: string; placa: string; status: string };

export default function CadastroPage() {
  const sessao = getSessao();
  const [chave, setChave] = useState<"clientes" | "veiculos">("clientes");

  // ── Chave Clientes ──
  const [query, setQuery] = useState("");
  const [resultados, setResultados] = useState<ClienteResumo[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [cadastrarClienteAberto, setCadastrarClienteAberto] = useState(false);
  const [cpfDetalhe, setCpfDetalhe] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 3) { setResultados([]); return; }
    debounceRef.current = setTimeout(async () => {
      setBuscando(true);
      const data = await chamarApi({ acao: "rh_cliente_buscar", query });
      if (data && data.ok) setResultados(data.clientes || []);
      setBuscando(false);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  // ── Chave Veículos ──
  const [motos, setMotos] = useState<MotoResumo[]>([]);
  const [carregandoMotos, setCarregandoMotos] = useState(false);
  const [cadastrarMotoAberto, setCadastrarMotoAberto] = useState(false);

  const carregarMotos = () => {
    setCarregandoMotos(true);
    chamarApi({ acao: "rh_listar_estoque_mobile" }).then((data) => {
      if (data && data.ok) setMotos(data.motos || []);
      setCarregandoMotos(false);
    });
  };

  useEffect(() => {
    if (chave === "veiculos" && motos.length === 0) carregarMotos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave]);

  return (
    <main className="min-h-screen bg-background text-foreground px-4 py-8 md:px-10">
      <BellButton />
      <TopBar />
      <div className="flex flex-col md:flex-row gap-8">
        <Sidebar nomeUsuario={sessao?.nome} />
        <div className="flex-1">
          <a href="/" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-accent mb-4"><ArrowLeft size={15} /> Voltar ao Rank</a>
          <h1 className="text-3xl md:text-4xl font-black mb-1">Cadastro</h1>
          <p className="text-muted-foreground text-sm mb-6">Porta de entrada rápida pra cadastro de clientes e veículos.</p>

          {/* Chaves */}
          <div className="flex gap-2 mb-6">
            <button onClick={() => setChave("clientes")}
              className={`h-10 px-4 rounded-lg text-sm font-semibold flex items-center gap-2 ${chave === "clientes" ? "bg-accent text-white" : "bg-white/5 text-muted-foreground border border-white/10"}`}>
              <Users size={15} /> Clientes
            </button>
            <button onClick={() => setChave("veiculos")}
              className={`h-10 px-4 rounded-lg text-sm font-semibold flex items-center gap-2 ${chave === "veiculos" ? "bg-accent text-white" : "bg-white/5 text-muted-foreground border border-white/10"}`}>
              <Bike size={15} /> Veículos
            </button>
          </div>

          {chave === "clientes" && (
            <div>
              <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
                <div className="relative flex-1 max-w-md">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Buscar por nome ou CPF (mín. 3 letras)"
                    className="w-full bg-white/5 border border-white/10 focus:border-accent rounded-lg h-10 pl-9 pr-3 text-sm outline-none"
                  />
                </div>
                <button onClick={() => setCadastrarClienteAberto(true)} className="h-10 px-4 rounded-lg bg-accent text-white font-bold text-sm flex items-center gap-2 shrink-0">
                  <Plus size={15} /> Cadastrar Cliente
                </button>
              </div>

              {buscando && <p className="text-muted-foreground text-sm">Buscando...</p>}
              {!buscando && query.trim().length >= 3 && resultados.length === 0 && (
                <p className="text-muted-foreground text-sm">Nenhum cliente encontrado.</p>
              )}
              {query.trim().length < 3 && (
                <p className="text-muted-foreground text-sm">
                  Digite ao menos 3 letras pra buscar, ou acesse{" "}
                  <a href="/clientes" className="text-accent underline" target="_blank" rel="noopener">a página completa de clientes</a>.
                </p>
              )}

              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3 mt-3">
                {resultados.map((r) => (
                  <button key={r.cpf} onClick={() => setCpfDetalhe(r.cpf)}
                    className="text-left bg-card border border-border rounded-xl p-4 hover:border-accent transition-colors">
                    <p className="font-bold">{r.nome}</p>
                    <p className="text-xs text-muted-foreground">CPF: {r.cpf}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {chave === "veiculos" && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <a href="/estoque" className="text-sm text-accent underline" target="_blank" rel="noopener">Ver estoque completo com filtros</a>
                <button onClick={() => setCadastrarMotoAberto(true)} className="h-10 px-4 rounded-lg bg-accent text-white font-bold text-sm flex items-center gap-2">
                  <Plus size={15} /> Cadastrar Novo Veículo
                </button>
              </div>

              {carregandoMotos && <p className="text-muted-foreground text-sm">Carregando...</p>}

              <div className="space-y-2">
                {motos.map((m) => (
                  <div key={m.linha} className="bg-card border border-border rounded-xl px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="font-bold">{m.marca} {m.modelo}</p>
                      <p className="text-xs text-muted-foreground">{m.placa || "Sem placa"} · {m.status}</p>
                    </div>
                    <a href={`/estoque?linha=${m.linha}`} target="_blank" rel="noopener" className="text-xs text-accent underline shrink-0">
                      Ver no Estoque
                    </a>
                  </div>
                ))}
                {!carregandoMotos && motos.length === 0 && (
                  <p className="text-muted-foreground text-sm">Nenhum veículo encontrado.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {cadastrarClienteAberto && (
        <ClienteWizardModal onClose={() => setCadastrarClienteAberto(false)} onCadastrado={(c) => setCpfDetalhe(c.cpf)} />
      )}
      {cpfDetalhe && <ClienteDetalheModal cpf={cpfDetalhe} onClose={() => setCpfDetalhe(null)} />}
      {cadastrarMotoAberto && (
        <CadastrarMotoModal onClose={() => setCadastrarMotoAberto(false)} onSalvo={carregarMotos} />
      )}
    </main>
  );
}
