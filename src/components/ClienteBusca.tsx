"use client";

import { useEffect, useRef, useState } from "react";
import { Search, UserPlus, Eye, X } from "lucide-react";
import { chamarApi } from "@/lib/sessao";

export type Cliente = {
  nome: string; cpf: string; rg?: string; nascimento?: string;
  nomePai?: string; nomeMae?: string; telefone?: string; email?: string;
  endereco?: string; bairro?: string; cidade?: string; estado?: string;
  cep?: string; estadoCivil?: string; profissao?: string;
};

type ClienteResumo = { nome: string; cpf: string; telefone?: string };

/**
 * Campo de busca de cliente reaproveitável (nome OU CPF, a partir de 3 letras).
 * Usado tanto pro campo "Nome do Cliente" quanto "Nome do Autorizado" no
 * fechamento de venda — os dois usam o mesmo cadastro de clientes por trás.
 * Ao clicar num resultado, o cliente já fica selecionado (não precisa do
 * botão "+ Cadastrar"). O "+" só é necessário quando a pessoa realmente
 * ainda não existe no cadastro.
 */
export function ClienteBusca({
  label, value, onChange,
}: {
  label: string;
  value: Cliente | null;
  onChange: (cliente: Cliente | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [resultados, setResultados] = useState<ClienteResumo[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [verDadosAberto, setVerDadosAberto] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const selecionar = async (resumo: ClienteResumo) => {
    const data = await chamarApi({ acao: "rh_cliente_consultar", cpf: resumo.cpf });
    if (data && data.ok) {
      onChange(data.cliente);
      setQuery("");
      setResultados([]);
    }
  };

  const abrirCadastro = () => {
    window.open("/clientes?novo=1", "_blank", "noopener");
  };

  if (value) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-lg p-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold text-accent">{label}</p>
          <p className="text-sm font-semibold truncate">{value.nome}</p>
          <p className="text-xs text-muted-foreground">CPF: {value.cpf}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button type="button" onClick={() => setVerDadosAberto(true)}
            className="h-8 px-2.5 rounded-lg bg-white/5 border border-white/10 text-xs font-semibold flex items-center gap-1 hover:border-accent">
            <Eye size={12} /> Ver dados
          </button>
          <button type="button" onClick={() => onChange(null)}
            className="h-8 w-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:border-accent">
            <X size={13} />
          </button>
        </div>
        {verDadosAberto && (
          <ClienteDetalheModal cpf={value.cpf} onClose={() => setVerDadosAberto(false)} />
        )}
      </div>
    );
  }

  return (
    <div>
      <label className="text-xs font-bold text-accent">{label}</label>
      <div className="relative mt-1">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nome ou CPF (mín. 3 letras)"
          className="w-full bg-white/5 border border-white/10 focus:border-accent rounded-lg h-9 pl-9 pr-3 text-sm outline-none"
        />
        {(resultados.length > 0 || buscando) && (
          <div className="absolute z-20 mt-1 w-full bg-card border border-border rounded-lg shadow-lg overflow-hidden">
            {buscando && <p className="text-xs text-muted-foreground px-3 py-2">Buscando...</p>}
            {!buscando && resultados.map((r) => (
              <button
                type="button"
                key={r.cpf}
                onClick={() => selecionar(r)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-white/5 flex flex-col"
              >
                <span className="font-semibold">{r.nome}</span>
                <span className="text-xs text-muted-foreground">CPF: {r.cpf}</span>
              </button>
            ))}
            {!buscando && resultados.length === 0 && query.trim().length >= 3 && (
              <p className="text-xs text-muted-foreground px-3 py-2">Nenhum cliente encontrado.</p>
            )}
          </div>
        )}
      </div>
      <button type="button" onClick={abrirCadastro}
        className="mt-2 text-xs text-accent underline flex items-center gap-1">
        <UserPlus size={12} /> + Cadastrar novo cliente
      </button>
    </div>
  );
}

/** Modal somente-leitura com os dados completos do cliente + motos vinculadas (por CPF). */
export function ClienteDetalheModal({ cpf, onClose }: { cpf: string; onClose: () => void }) {
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [motos, setMotos] = useState<{ linha: number; marca: string; modelo: string; placa: string; status: string; papel: string }[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    chamarApi({ acao: "rh_cliente_consultar", cpf }).then((data) => {
      if (data && data.ok) {
        setCliente(data.cliente);
        setMotos(data.motos || []);
      } else {
        setErro((data && data.erro) || "Erro ao consultar cliente.");
      }
      setCarregando(false);
    });
  }, [cpf]);

  const campo = (label: string, v?: string) => (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm">{v || "—"}</p>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black">👁 Dados do Cliente</h3>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
          </div>

          {carregando && <p className="text-muted-foreground text-sm">Carregando...</p>}
          {erro && <p className="text-accent text-sm">❌ {erro}</p>}

          {cliente && (
            <>
              <div className="grid grid-cols-2 gap-3">
                {campo("Nome", cliente.nome)}
                {campo("CPF", cliente.cpf)}
                {campo("RG", cliente.rg)}
                {campo("Nascimento", cliente.nascimento)}
                {campo("Estado Civil", cliente.estadoCivil)}
                {campo("Profissão", cliente.profissao)}
                {campo("Nome do Pai", cliente.nomePai)}
                {campo("Nome da Mãe", cliente.nomeMae)}
                {campo("Telefone", cliente.telefone)}
                {campo("Email", cliente.email)}
                {campo("Endereço", cliente.endereco)}
                {campo("Bairro", cliente.bairro)}
                {campo("Cidade", cliente.cidade)}
                {campo("Estado", cliente.estado)}
                {campo("CEP", cliente.cep)}
              </div>

              <div>
                <p className="text-xs font-bold text-accent mb-2">🏍️ Motos vinculadas</p>
                {motos.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma moto vinculada ainda.</p>}
                <div className="space-y-2">
                  {motos.map((m) => (
                    <a key={m.linha + m.papel} href={`/estoque?linha=${m.linha}`} target="_blank" rel="noopener"
                      className="block bg-white/5 border border-white/10 rounded-lg px-3 py-2 hover:border-accent">
                      <p className="text-sm font-semibold">{m.marca} {m.modelo}</p>
                      <p className="text-xs text-muted-foreground">
                        {m.placa || "Sem placa"} · {m.status} · {m.papel === "comprador" ? "Comprador" : "Autorizado"}
                      </p>
                    </a>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
