"use client";

import { useEffect, useState } from "react";
import { Sidebar, TopBar, BellButton } from "@/components/Sidebar";
import { chamarApi, getSessao } from "@/lib/sessao";
import { ArrowLeft } from "lucide-react";

const LOJAS = ["Salinas", "Atlântica", "União Motos", "Vision", "Maré Motos", "Muralha", "Império", "Confort", "PQD Motos", "Rio das Ostras", "Infinity", "Baby Motos"];

type Gerente = { nome: string; loja?: string };

export default function ConexaoPage() {
  const sessao = getSessao();
  const [aba, setAba] = useState<"protocolo" | "vistoria">("protocolo");
  const [gerentes, setGerentes] = useState<Gerente[]>([]);

  const [protModelo, setProtModelo] = useState("");
  const [protPlaca, setProtPlaca] = useState("");
  const [protChassi, setProtChassi] = useState("");
  const [protVendedor, setProtVendedor] = useState("");
  const [protLoja, setProtLoja] = useState("");
  const [protSaidaLoja, setProtSaidaLoja] = useState("");
  const [mencionadosProt, setMencionadosProt] = useState<string[]>([]);
  const [erroProt, setErroProt] = useState("");

  const [vistPlaca, setVistPlaca] = useState("");
  const [vistChassi, setVistChassi] = useState("");
  const [vistModelo, setVistModelo] = useState("");
  const [vistPrecisaPlaca, setVistPrecisaPlaca] = useState("");
  const [vistLink, setVistLink] = useState("");
  const [vistLoja, setVistLoja] = useState("");
  const [vistLojaVistoria, setVistLojaVistoria] = useState("");
  const [vistBanco, setVistBanco] = useState("");
  const [mencionadosVist, setMencionadosVist] = useState<string[]>([]);
  const [erroVist, setErroVist] = useState("");

  useEffect(() => {
    chamarApi({ acao: "evo_listar_gerentes" }).then((data) => {
      if (data && data.ok) setGerentes(data.gerentes || []);
    });
  }, []);

  const toggleMencao = (nome: string, lista: string[], setLista: (l: string[]) => void) => {
    setLista(lista.includes(nome) ? lista.filter((n) => n !== nome) : [...lista, nome]);
  };

  const chipsMencao = (mencionados: string[], setLista: (l: string[]) => void) => (
    <div className="flex flex-wrap gap-1.5">
      {gerentes.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhum gerente cadastrado ainda.</p>
      ) : (
        gerentes.map((g) => (
          <button
            key={g.nome}
            type="button"
            onClick={() => toggleMencao(g.nome, mencionados, setLista)}
            className={`px-2.5 py-1 rounded-full text-xs border ${
              mencionados.includes(g.nome) ? "bg-accent text-white border-accent" : "bg-white/5 border-white/10"
            }`}
          >
            {g.nome}{g.loja ? ` (${g.loja})` : ""}
          </button>
        ))
      )}
    </div>
  );

  const enviarProtocolo = async () => {
    if (!protPlaca || !protLoja || !protSaidaLoja) {
      setErroProt("Preencha ao menos Placa, Loja e Saída da Loja.");
      return;
    }
    setErroProt("Enviando...");
    const data = await chamarApi({
      acao: "evo_protocolo_retirada",
      dados: { modelo: protModelo, placa: protPlaca, chassi: protChassi, vendedor: protVendedor, loja: protLoja, saidaLoja: protSaidaLoja },
      mencionados: mencionadosProt,
      solicitante: sessao?.nome,
    });
    if (data && data.ok) {
      setErroProt("✅ Protocolo enviado para o grupo!");
      setProtModelo(""); setProtPlaca(""); setProtChassi(""); setProtVendedor("");
      setProtLoja(""); setProtSaidaLoja(""); setMencionadosProt([]);
    } else {
      setErroProt("❌ " + ((data && data.erro) || "Erro ao enviar."));
    }
  };

  const enviarVistoria = async () => {
    if (!vistPlaca || !vistLoja || !vistLojaVistoria) {
      setErroVist("Preencha ao menos Placa, Loja e Loja de Vistoria.");
      return;
    }
    setErroVist("Enviando...");
    const data = await chamarApi({
      acao: "evo_pedido_vistoria",
      dados: {
        placa: vistPlaca, chassi: vistChassi, modelo: vistModelo, precisaPlaca: vistPrecisaPlaca,
        link: vistLink, loja: vistLoja, lojaVistoria: vistLojaVistoria, banco: vistBanco,
      },
      mencionados: mencionadosVist,
      solicitante: sessao?.nome,
    });
    if (data && data.ok) {
      setErroVist("✅ Pedido de vistoria enviado para o grupo!");
      setVistPlaca(""); setVistChassi(""); setVistModelo(""); setVistPrecisaPlaca("");
      setVistLink(""); setVistLoja(""); setVistLojaVistoria(""); setVistBanco(""); setMencionadosVist([]);
    } else {
      setErroVist("❌ " + ((data && data.erro) || "Erro ao enviar."));
    }
  };

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
        <div className="flex-1 max-w-lg">
          <a href="/" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-accent mb-4"><ArrowLeft size={15} /> Voltar ao Rank</a>
          <h1 className="text-3xl md:text-4xl font-black mb-6">📡 Conexão <span className="text-accent">entre Lojas</span></h1>

          <div className="flex gap-2 mb-4">
            <button onClick={() => setAba("protocolo")} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${aba === "protocolo" ? "bg-accent text-white" : "bg-white/5 text-muted-foreground"}`}>Protocolo de Retirada</button>
            <button onClick={() => setAba("vistoria")} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${aba === "vistoria" ? "bg-accent text-white" : "bg-white/5 text-muted-foreground"}`}>Pedido de Vistoria</button>
          </div>

          {aba === "protocolo" && (
            <div className="space-y-3">
              <input placeholder="Modelo" value={protModelo} onChange={(e) => setProtModelo(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg h-9 px-3 text-sm" />
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="Placa *" value={protPlaca} onChange={(e) => setProtPlaca(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg h-9 px-3 text-sm" />
                <input placeholder="Chassi" value={protChassi} onChange={(e) => setProtChassi(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg h-9 px-3 text-sm" />
              </div>
              <input placeholder="Vendedor" value={protVendedor} onChange={(e) => setProtVendedor(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg h-9 px-3 text-sm" />
              <div className="grid grid-cols-2 gap-3">
                <select value={protLoja} onChange={(e) => setProtLoja(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg h-9 px-2 text-sm">
                  <option value="">Loja *</option>
                  {LOJAS.map((l) => <option key={l}>{l}</option>)}
                </select>
                <select value={protSaidaLoja} onChange={(e) => setProtSaidaLoja(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg h-9 px-2 text-sm">
                  <option value="">Saída da loja *</option>
                  {LOJAS.map((l) => <option key={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1.5">Mencionar gerentes</label>
                {chipsMencao(mencionadosProt, setMencionadosProt)}
              </div>
              {erroProt && <p className="text-sm">{erroProt}</p>}
              <button onClick={enviarProtocolo} className="w-full h-10 rounded-lg bg-accent text-white font-bold text-sm">📤 Enviar Protocolo</button>
            </div>
          )}

          {aba === "vistoria" && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="Placa *" value={vistPlaca} onChange={(e) => setVistPlaca(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg h-9 px-3 text-sm" />
                <input placeholder="Chassi" value={vistChassi} onChange={(e) => setVistChassi(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg h-9 px-3 text-sm" />
              </div>
              <input placeholder="Modelo" value={vistModelo} onChange={(e) => setVistModelo(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg h-9 px-3 text-sm" />
              <select value={vistPrecisaPlaca} onChange={(e) => setVistPrecisaPlaca(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg h-9 px-2 text-sm">
                <option value="">Precisa de placa?</option>
                <option value="sim">Sim</option>
                <option value="nao">Não</option>
              </select>
              <input placeholder="Link (opcional)" value={vistLink} onChange={(e) => setVistLink(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg h-9 px-3 text-sm" />
              <div className="grid grid-cols-2 gap-3">
                <select value={vistLoja} onChange={(e) => setVistLoja(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg h-9 px-2 text-sm">
                  <option value="">Loja *</option>
                  {LOJAS.map((l) => <option key={l}>{l}</option>)}
                </select>
                <select value={vistLojaVistoria} onChange={(e) => setVistLojaVistoria(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg h-9 px-2 text-sm">
                  <option value="">Loja de vistoria *</option>
                  {LOJAS.map((l) => <option key={l}>{l}</option>)}
                </select>
              </div>
              <input placeholder="Banco" value={vistBanco} onChange={(e) => setVistBanco(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg h-9 px-3 text-sm" />
              <div>
                <label className="text-xs text-muted-foreground block mb-1.5">Mencionar gerentes</label>
                {chipsMencao(mencionadosVist, setMencionadosVist)}
              </div>
              {erroVist && <p className="text-sm">{erroVist}</p>}
              <button onClick={enviarVistoria} className="w-full h-10 rounded-lg bg-accent text-white font-bold text-sm">📤 Enviar Pedido de Vistoria</button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
