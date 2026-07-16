"use client";

import { useEffect, useState } from "react";
import { Sidebar, TopBar, BellButton } from "@/components/Sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { chamarApi, getSessao } from "@/lib/sessao";
import { ArrowLeft, Plus, X, KeyRound } from "lucide-react";
import { useConfigVisual } from "@/lib/useConfigVisual";

type Pessoa = { nome: string; email: string; telefone: string; cargo: string; loja: string; cadastradoPor: string };
const LOJAS = ["Salinas","Atlântica","União Motos","Vision","Maré Motos","Muralha","Império","Confort","PQD Motos","Rio das Ostras","Infinity"];

export default function RhPage() {
  const sessao = getSessao();
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [cadastrando, setCadastrando] = useState(false);
  const [editandoPix, setEditandoPix] = useState<Pessoa | null>(null);

  const carregar = () => {
    chamarApi({ acao: "rh_listar", nomeQuemPede: sessao?.nome }).then((data) => {
      if (data && data.ok) { setPessoas(data.pessoas || []); setErro(""); }
      else setErro((data && data.erro) || "Sem permissão.");
      setCarregando(false);
    });
  };
  useEffect(() => { carregar(); }, []);

  const configVisual = useConfigVisual("rh");

  return (
    <main
      className="min-h-screen bg-background text-foreground px-4 py-8 md:px-10 relative"
      style={{
        backgroundColor: configVisual?.corFundo || undefined,
        fontFamily: configVisual?.fonte || undefined,
        ["--accent" as any]: configVisual?.corBotao || undefined,
      }}
    >
      {configVisual?.midiaFundoUrl && (
        configVisual.midiaFundoTipo === "video" ? (
          <video src={configVisual.midiaFundoUrl} className="fixed inset-0 w-full h-full object-cover -z-10 opacity-30" autoPlay muted loop />
        ) : (
          <img src={configVisual.midiaFundoUrl} className="fixed inset-0 w-full h-full object-cover -z-10 opacity-30" alt="" />
        )
      )}
      <BellButton />
      <TopBar />
      <div className="flex flex-col md:flex-row gap-8">
        <Sidebar nomeUsuario={sessao?.nome} />
        <div className="flex-1">
          <div className="flex items-center justify-between mb-4">
            <a href="/" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-accent"><ArrowLeft size={15} /> Voltar ao Rank</a>
            <button onClick={() => setCadastrando(true)} className="h-10 px-4 rounded-lg bg-accent text-white font-bold text-sm flex items-center gap-2">
              <Plus size={15} /> Cadastrar Pessoa
            </button>
          </div>
          <h1 className="text-3xl md:text-4xl font-black mb-6">RH / Gerência</h1>

          {erro && <p className="text-accent mb-4">❌ {erro}</p>}
          {carregando && <p className="text-muted-foreground">Carregando...</p>}

          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {pessoas.map((p) => (
              <Card key={p.nome} className="border-border">
                <CardContent className="py-4">
                  <p className="font-bold">{p.nome}</p>
                  <p className="text-xs text-muted-foreground capitalize">{p.cargo} · {p.loja || "—"}</p>
                  <p className="text-xs text-muted-foreground">{p.telefone}</p>
                  <button onClick={() => setEditandoPix(p)} className="mt-2 text-xs text-accent flex items-center gap-1">
                    <KeyRound size={11} /> Editar PIX
                  </button>
                </CardContent>
              </Card>
            ))}
            {!carregando && pessoas.length === 0 && !erro && (
              <p className="text-muted-foreground text-sm">Nenhuma pessoa cadastrada ainda.</p>
            )}
          </div>
        </div>
      </div>

      {cadastrando && <CadastrarPessoaModal onClose={() => setCadastrando(false)} onSalvo={carregar} sessao={sessao} />}
      {editandoPix && <EditarPixModal pessoa={editandoPix} onClose={() => setEditandoPix(null)} sessao={sessao} />}
    </main>
  );
}

function CadastrarPessoaModal({ onClose, onSalvo, sessao }: { onClose: () => void; onSalvo: () => void; sessao: any }) {
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [cargo, setCargo] = useState("vendedor");
  const [loja, setLoja] = useState("");
  const [senhaMaster, setSenhaMaster] = useState("");
  const [msg, setMsg] = useState("");
  const [salvando, setSalvando] = useState(false);

  const salvar = async () => {
    setSalvando(true);
    const data = await chamarApi({
      acao: "rh_cadastrar",
      novo: { nome, telefone, email, senha, cargo, loja },
      nomeQuemCadastra: sessao?.nome,
      senhaMaster: senhaMaster || undefined,
    });
    if (data && data.ok) { onSalvo(); onClose(); }
    else setMsg("❌ " + ((data && data.erro) || "Erro ao cadastrar."));
    setSalvando(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl max-w-sm w-full p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground"><X size={20} /></button>
        <h2 className="text-xl font-black mb-4">CADASTRAR <span className="text-accent">PESSOA</span></h2>
        <div className="space-y-2">
          <input placeholder="Nome" value={nome} onChange={(e) => setNome(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg h-9 px-3 text-sm" />
          <input placeholder="Telefone" value={telefone} onChange={(e) => setTelefone(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg h-9 px-3 text-sm" />
          <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg h-9 px-3 text-sm" />
          <input placeholder="Senha" value={senha} onChange={(e) => setSenha(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg h-9 px-3 text-sm" />
          <select value={cargo} onChange={(e) => setCargo(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg h-9 px-3 text-sm">
            <option value="vendedor">Vendedor</option>
            <option value="gerente">Gerente</option>
            <option value="gestor">Gestor</option>
          </select>
          <select value={loja} onChange={(e) => setLoja(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg h-9 px-3 text-sm">
            <option value="">Loja —</option>
            {LOJAS.map((l) => <option key={l}>{l}</option>)}
          </select>
          {(cargo === "gerente" || cargo === "gestor") && (
            <input type="password" placeholder="Senha master (obrigatório p/ gerente/gestor)" value={senhaMaster} onChange={(e) => setSenhaMaster(e.target.value)}
              autoComplete="new-password" name="performace-rh-senha"
              className="w-full bg-white/5 border border-white/10 rounded-lg h-9 px-3 text-sm" />
          )}
          {msg && <p className="text-sm">{msg}</p>}
          <button onClick={salvar} disabled={salvando} className="w-full h-10 rounded-lg bg-accent text-white font-bold text-sm disabled:opacity-60">
            {salvando ? "Salvando..." : "Cadastrar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function EditarPixModal({ pessoa, onClose, sessao }: { pessoa: Pessoa; onClose: () => void; sessao: any }) {
  const [chavePix, setChavePix] = useState("");
  const [msg, setMsg] = useState("");
  const salvar = async () => {
    const data = await chamarApi({ acao: "rh_atualizar_pix", nome: pessoa.nome, chavePix, solicitante: sessao?.nome });
    if (data && data.ok) { setMsg("✅ Salvo!"); setTimeout(onClose, 700); }
    else setMsg("❌ " + ((data && data.erro) || "Erro."));
  };
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl max-w-xs w-full p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground"><X size={20} /></button>
        <h2 className="text-lg font-black mb-3">PIX — {pessoa.nome}</h2>
        <input placeholder="Chave PIX" value={chavePix} onChange={(e) => setChavePix(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-lg h-9 px-3 text-sm mb-2" />
        {msg && <p className="text-sm mb-2">{msg}</p>}
        <button onClick={salvar} className="w-full h-10 rounded-lg bg-accent text-white font-bold text-sm">Salvar</button>
      </div>
    </div>
  );
}
