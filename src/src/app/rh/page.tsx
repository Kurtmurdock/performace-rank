"use client";

import { useEffect, useState } from "react";
import { Sidebar, TopBar, BellButton } from "@/components/Sidebar";
import { chamarApi, getSessao } from "@/lib/sessao";
import { ArrowLeft } from "lucide-react";
import { DadosLojasModal } from "@/components/DadosLojasModal";

const LOJAS = ["Salinas", "Atlântica", "União Motos", "Vision", "Maré Motos", "Muralha", "Império", "Confort", "PQD Motos", "Rio das Ostras", "Infinity", "Baby Motos"];

type Pessoa = { nome: string; cargo: string; loja?: string; cadastradoEm?: string };
type LogEntry = { data: string; horario: string; nome: string; cargo: string; loja?: string };

export default function RHPage() {
  const sessao = getSessao();
  const ehGestor = sessao?.cargo === "gestor";

  const [aba, setAba] = useState<"cadastrar" | "lista" | "log">("cadastrar");
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [dadosLojasAberto, setDadosLojasAberto] = useState(false);

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [nascimento, setNascimento] = useState("");
  const [senha, setSenha] = useState("");
  const [cargo, setCargo] = useState("");
  const [loja, setLoja] = useState("");
  const [tipoVenda, setTipoVenda] = useState("");
  const [chavePix, setChavePix] = useState("");
  const [senhaMaster, setSenhaMaster] = useState("");
  const [msg, setMsg] = useState("");
  const [salvando, setSalvando] = useState(false);

  const carregarLista = () => {
    setCarregando(true);
    chamarApi({ acao: "rh_listar", nomeQuemPede: sessao?.nome }).then((data) => {
      if (data && data.ok) setPessoas(data.pessoas || []);
      setCarregando(false);
    });
  };
  const carregarLog = () => {
    setCarregando(true);
    chamarApi({ acao: "rh_log_gerencia", nomeQuemPede: sessao?.nome, limite: 50 }).then((data) => {
      if (data && data.ok) setLog(data.log || []);
      setCarregando(false);
    });
  };

  useEffect(() => {
    if (aba === "lista") carregarLista();
    if (aba === "log") carregarLog();
  }, [aba]);

  const cadastrar = async () => {
    setMsg("");
    if (!nome || !senha || !cargo) { setMsg("❌ Preencha nome, senha e cargo."); return; }
    if (cargo === "vendedor" && !tipoVenda) { setMsg("❌ Selecione se o vendedor vende Moto, Carro ou Ambos."); return; }
    setSalvando(true);
    const data = await chamarApi({
      acao: "rh_cadastrar",
      nomeQuemCadastra: sessao?.nome,
      senhaMaster,
      novo: { nome, email, telefone, nascimento, senha, cargo, loja, tipoVenda, chavePix },
    });
    if (data && data.ok) {
      setMsg("✅ Cadastrado!");
      setNome(""); setEmail(""); setTelefone(""); setNascimento(""); setSenha("");
      setCargo(""); setLoja(""); setTipoVenda(""); setChavePix(""); setSenhaMaster("");
    } else {
      setMsg("❌ " + ((data && data.erro) || "Erro ao cadastrar"));
    }
    setSalvando(false);
  };

  const editarPix = async (pessoaNome: string) => {
    const novaChave = prompt(`Chave PIX de ${pessoaNome}:`, "");
    if (novaChave === null) return;
    const data = await chamarApi({ acao: "rh_atualizar_pix", nome: pessoaNome, chavePix: novaChave, solicitante: sessao?.nome });
    alert(data && data.ok ? "Chave PIX atualizada!" : "Erro: " + ((data && data.erro) || "não foi possível salvar"));
  };

  const cargoLabel = (c: string) => (c === "gestor" ? "👑 Gestor" : c === "gerente" ? "🏪 Gerente" : "🧑 Vendedor");

  if (!sessao) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background text-foreground px-4 text-center">
        <p className="text-muted-foreground">Sessão não encontrada. <a href="/login" className="text-accent underline">Fazer login</a></p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground px-4 py-8 md:px-10">
      <BellButton />
      <TopBar />
      <div className="flex flex-col md:flex-row gap-8">
        <Sidebar nomeUsuario={sessao?.nome} />
        <div className="flex-1 max-w-2xl">
          <div className="flex items-center justify-between mb-4">
            <a href="/" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-accent"><ArrowLeft size={15} /> Voltar ao Rank</a>
            {ehGestor && (
              <button onClick={() => setDadosLojasAberto(true)} className="h-10 px-4 rounded-lg bg-white/5 border border-white/10 text-sm font-semibold hover:border-accent transition-colors">
                🏪 Dados das Lojas
              </button>
            )}
          </div>
          <h1 className="text-3xl md:text-4xl font-black mb-6">👤 RH / <span className="text-accent">Gerência</span></h1>

          <div className="flex gap-2 mb-6">
            <button onClick={() => setAba("cadastrar")} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${aba === "cadastrar" ? "bg-accent text-white" : "bg-white/5 text-muted-foreground"}`}>Cadastrar</button>
            <button onClick={() => setAba("lista")} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${aba === "lista" ? "bg-accent text-white" : "bg-white/5 text-muted-foreground"}`}>Pessoas</button>
            <button onClick={() => setAba("log")} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${aba === "log" ? "bg-accent text-white" : "bg-white/5 text-muted-foreground"}`}>Log de Login</button>
          </div>

          {aba === "cadastrar" && (
            <div className="space-y-3 max-w-md">
              <input placeholder="Nome" value={nome} onChange={(e) => setNome(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg h-9 px-3 text-sm" />
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg h-9 px-3 text-sm" />
                <input placeholder="Telefone" value={telefone} onChange={(e) => setTelefone(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg h-9 px-3 text-sm" />
                <input placeholder="Data de nascimento" value={nascimento} onChange={(e) => setNascimento(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg h-9 px-3 text-sm" />
                <input placeholder="Senha" value={senha} onChange={(e) => setSenha(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg h-9 px-3 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <select value={cargo} onChange={(e) => setCargo(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg h-9 px-2 text-sm">
                  <option value="">Cargo...</option>
                  <option value="vendedor">Vendedor</option>
                  {ehGestor && <option value="gerente">Gerente</option>}
                  {ehGestor && <option value="gestor">Gestor</option>}
                </select>
                <select value={loja} onChange={(e) => setLoja(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg h-9 px-2 text-sm">
                  <option value="">Loja...</option>
                  {LOJAS.map((l) => <option key={l}>{l}</option>)}
                </select>
              </div>
              {cargo === "vendedor" && (
                <select value={tipoVenda} onChange={(e) => setTipoVenda(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg h-9 px-2 text-sm">
                  <option value="">Tipo de venda...</option>
                  <option value="Moto">Moto</option>
                  <option value="Carro">Carro</option>
                  <option value="Ambos">Ambos</option>
                </select>
              )}
              <input placeholder="Chave PIX (opcional)" value={chavePix} onChange={(e) => setChavePix(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg h-9 px-3 text-sm" />
              {(cargo === "gestor" || cargo === "gerente") && (
                <input type="password" placeholder="Senha master" value={senhaMaster} onChange={(e) => setSenhaMaster(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg h-9 px-3 text-sm" />
              )}
              {msg && <p className="text-sm">{msg}</p>}
              <button onClick={cadastrar} disabled={salvando} className="w-full h-10 rounded-lg bg-accent text-white font-bold text-sm disabled:opacity-60">
                {salvando ? "Cadastrando..." : "💾 Cadastrar"}
              </button>
            </div>
          )}

          {aba === "lista" && (
            <div className="space-y-2 max-w-md">
              {carregando && <p className="text-muted-foreground text-sm">Carregando...</p>}
              {!carregando && pessoas.length === 0 && <p className="text-muted-foreground text-sm">Nenhuma pessoa cadastrada ainda.</p>}
              {pessoas.map((p) => (
                <div key={p.nome} className="flex items-center justify-between bg-white/5 border border-white/10 rounded-lg p-3">
                  <span className="text-sm">{cargoLabel(p.cargo)} — {p.nome}{p.loja ? ` (${p.loja})` : ""}</span>
                  <button onClick={() => editarPix(p.nome)} className="text-xs text-accent underline shrink-0">🔑 PIX</button>
                </div>
              ))}
            </div>
          )}

          {aba === "log" && (
            <div className="space-y-1.5 max-w-md">
              {carregando && <p className="text-muted-foreground text-sm">Carregando...</p>}
              {!carregando && log.length === 0 && <p className="text-muted-foreground text-sm">Sem registros ainda.</p>}
              {log.map((l, i) => (
                <div key={i} className="text-sm border-b border-white/5 pb-1.5">
                  {l.data} {l.horario} — <b>{l.nome}</b> ({l.cargo}{l.loja ? `, ${l.loja}` : ""})
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {dadosLojasAberto && <DadosLojasModal onClose={() => setDadosLojasAberto(false)} sessao={sessao} />}
    </main>
  );
}
