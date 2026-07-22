"use client";

import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { Sidebar, TopBar, BellButton } from "@/components/Sidebar";
import { chamarApi, getSessao } from "@/lib/sessao";
import { ArrowLeft, Upload, Pencil } from "lucide-react";
import { useConfigVisual } from "@/lib/useConfigVisual";

type Lead = { id: number; nome: string; telefone: string; regiao: "rio" | "lagos" };
type GrupoLead = { regiao: string; nome: string; grupoId: string };
type Instancia = { nome: string; instancia: string };
const DDDS_RIO = ["21"];

export default function LeadsPage() {
  const sessao = getSessao();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selecionados, setSelecionados] = useState<Set<number>>(new Set());
  const [status, setStatus] = useState("");
  const [disparando, setDisparando] = useState(false);

  // Grupo de destino por REGIÃO (um pra Lagos, outro pro Rio — já que os
  // leads já são separados por região automaticamente) e instância do
  // WhatsApp — antes era sorteio aleatório entre os grupos; agora o Alan
  // escolhe, com nome editável (ele ainda tá descobrindo qual grupo é de
  // qual loja) e o código de contato sempre visível.
  const [grupos, setGrupos] = useState<GrupoLead[]>([]);
  const [grupoLagos, setGrupoLagos] = useState("");
  const [grupoRio, setGrupoRio] = useState("");
  const [editandoGrupoId, setEditandoGrupoId] = useState<string | null>(null);
  const [nomeGrupoEditado, setNomeGrupoEditado] = useState("");

  // 10 vagas fixas de instância — as 2 primeiras já conhecidas, as outras
  // 8 o Alan preenche conforme for criando novas.
  const [instancias, setInstancias] = useState<Instancia[]>([]);
  const [instanciaEscolhida, setInstanciaEscolhida] = useState("");
  const [salvandoInstancias, setSalvandoInstancias] = useState(false);
  const [msgInstancias, setMsgInstancias] = useState("");

  useEffect(() => {
    chamarApi({ acao: "evo_listar_grupos_leads" }).then((data) => {
      if (data && data.ok) {
        const lista: GrupoLead[] = data.grupos || [];
        setGrupos(lista);
        const primeiroLagos = lista.find((g) => g.regiao === "lagos");
        const primeiroRio = lista.find((g) => g.regiao === "rio");
        if (primeiroLagos) setGrupoLagos(primeiroLagos.grupoId);
        if (primeiroRio) setGrupoRio(primeiroRio.grupoId);
      }
    });
    chamarApi({ acao: "evo_listar_instancias" }).then((data) => {
      if (data && data.ok) {
        setInstancias(data.instancias || []);
        const primeiraComValor = (data.instancias || []).find((i: Instancia) => i.instancia);
        if (primeiraComValor) setInstanciaEscolhida(primeiraComValor.instancia);
      }
    });
  }, []);

  const salvarNomeGrupo = async (grupoId: string) => {
    if (!nomeGrupoEditado.trim()) return;
    await chamarApi({ acao: "evo_renomear_grupo_leads", grupoId, novoNome: nomeGrupoEditado.trim() });
    setGrupos((gs) => gs.map((g) => g.grupoId === grupoId ? { ...g, nome: nomeGrupoEditado.trim() } : g));
    setEditandoGrupoId(null);
  };

  const atualizarInstancia = (idx: number, campo: "nome" | "instancia", valor: string) => {
    setInstancias((is) => is.map((item, i) => i === idx ? { ...item, [campo]: valor } : item));
  };

  const salvarInstancias = async () => {
    setSalvandoInstancias(true);
    setMsgInstancias("");
    const data = await chamarApi({ acao: "evo_salvar_todas_instancias", instancias });
    if (data && data.ok) {
      setMsgInstancias("✅ Instâncias salvas!");
      const primeiraComValor = instancias.find((i) => i.instancia);
      if (primeiraComValor && !instanciaEscolhida) setInstanciaEscolhida(primeiraComValor.instancia);
    } else {
      setMsgInstancias("❌ " + ((data && data.erro) || "Erro ao salvar."));
    }
    setSalvandoInstancias(false);
  };

  const processarArquivo = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = e.target?.result;
      const wb = XLSX.read(data, { type: "binary" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const linhas: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      const novosLeads: Lead[] = [];
      linhas.forEach((row, i) => {
        if (i === 0) return; // pula cabeçalho
        const nome = (row[0] || "").toString().trim();
        const telefoneRaw = (row[1] || "").toString().replace(/\D/g, "");
        if (!nome || !telefoneRaw) return;
        const tel = telefoneRaw.length <= 11 ? "55" + telefoneRaw : telefoneRaw;
        const ddd = telefoneRaw.length <= 11 ? telefoneRaw.slice(0, 2) : telefoneRaw.slice(2, 4);
        novosLeads.push({ id: i, nome, telefone: tel, regiao: DDDS_RIO.includes(ddd) ? "rio" : "lagos" });
      });
      setLeads(novosLeads);
      setSelecionados(new Set(novosLeads.map((l) => l.id)));
      setStatus(`✅ ${novosLeads.length} leads carregados.`);
    };
    reader.readAsBinaryString(file);
  };

  const alternarTodos = (regiao: "rio" | "lagos", marcar: boolean) => {
    setSelecionados((prev) => {
      const novo = new Set(prev);
      leads.filter((l) => l.regiao === regiao).forEach((l) => (marcar ? novo.add(l.id) : novo.delete(l.id)));
      return novo;
    });
  };

  const disparar = async () => {
    const escolhidos = leads.filter((l) => selecionados.has(l.id));
    if (!escolhidos.length) return;
    setDisparando(true);
    let enviados = 0;
    const TAMANHO_LOTE = 50;
    for (let i = 0; i < escolhidos.length; i += TAMANHO_LOTE) {
      const lote = escolhidos.slice(i, i + TAMANHO_LOTE);
      setStatus(`Enviando... (${enviados}/${escolhidos.length})`);
      const data = await chamarApi({ acao: "evo_disparar_leads", leads: lote, grupoLagos, grupoRio, instancia: instanciaEscolhida });
      if (data && data.ok) enviados += data.enviados || lote.length;
      else { setStatus("❌ " + ((data && data.erro) || "Erro no disparo.")); setDisparando(false); return; }
    }
    setStatus(`✅ Concluído (${enviados} enviados)`);
    setDisparando(false);
  };

  const lagos = leads.filter((l) => l.regiao === "lagos");
  const rio = leads.filter((l) => l.regiao === "rio");

  const configVisual = useConfigVisual("leads");

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
        <div className="flex-1 max-w-3xl">
          <a href="/" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-accent mb-4"><ArrowLeft size={15} /> Voltar ao Rank</a>
          <h1 className="text-3xl md:text-4xl font-black mb-2">Leads</h1>
          <p className="text-muted-foreground text-sm mb-6">Upload de planilha — roteamento automático por DDD (21 = Rio, outros como 22 = Lagos)</p>

          <label className="flex items-center justify-center gap-2 h-12 rounded-lg bg-accent text-white font-bold text-sm cursor-pointer mb-3">
            <Upload size={16} /> Selecionar planilha (.xlsx ou .csv)
            <input type="file" accept=".xlsx,.csv" className="hidden" onChange={(e) => e.target.files?.[0] && processarArquivo(e.target.files[0])} />
          </label>
          {status && <p className="text-sm mb-4">{status}</p>}

          {leads.length > 0 && (
            <>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-card border border-border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-bold">Lagos ({lagos.length})</p>
                    <label className="text-xs flex items-center gap-1">
                      <input type="checkbox" onChange={(e) => alternarTodos("lagos", e.target.checked)} defaultChecked /> Marcar todos
                    </label>
                  </div>
                  <div className="max-h-64 overflow-y-auto space-y-1">
                    {lagos.map((l) => (
                      <label key={l.id} className="flex items-center justify-between text-xs py-1">
                        <span className="flex items-center gap-1.5">
                          <input type="checkbox" checked={selecionados.has(l.id)}
                            onChange={(e) => setSelecionados((prev) => { const n = new Set(prev); e.target.checked ? n.add(l.id) : n.delete(l.id); return n; })} />
                          {l.nome}
                        </span>
                        <span className="text-muted-foreground">{l.telefone}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="bg-card border border-border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-bold">Rio de Janeiro ({rio.length})</p>
                    <label className="text-xs flex items-center gap-1">
                      <input type="checkbox" onChange={(e) => alternarTodos("rio", e.target.checked)} defaultChecked /> Marcar todos
                    </label>
                  </div>
                  <div className="max-h-64 overflow-y-auto space-y-1">
                    {rio.map((l) => (
                      <label key={l.id} className="flex items-center justify-between text-xs py-1">
                        <span className="flex items-center gap-1.5">
                          <input type="checkbox" checked={selecionados.has(l.id)}
                            onChange={(e) => setSelecionados((prev) => { const n = new Set(prev); e.target.checked ? n.add(l.id) : n.delete(l.id); return n; })} />
                          {l.nome}
                        </span>
                        <span className="text-muted-foreground">{l.telefone}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="bg-card border border-border rounded-lg p-3">
                  <p className="text-xs font-bold text-accent mb-2">Grupos — Lagos (escolha 1)</p>
                  <div className="space-y-1.5">
                    {grupos.filter((g) => g.regiao === "lagos").map((g) => (
                      <div key={g.grupoId} className="flex items-center gap-2 bg-white/5 rounded-lg px-2 py-1.5">
                        <input type="radio" name="grupoLagos" checked={grupoLagos === g.grupoId} onChange={() => setGrupoLagos(g.grupoId)} />
                        {editandoGrupoId === g.grupoId ? (
                          <>
                            <input value={nomeGrupoEditado} onChange={(e) => setNomeGrupoEditado(e.target.value)} autoFocus
                              className="flex-1 bg-white/5 border border-white/10 rounded h-7 px-1.5 text-xs" />
                            <button onClick={() => salvarNomeGrupo(g.grupoId)} className="text-[11px] text-accent shrink-0">Salvar</button>
                            <button onClick={() => setEditandoGrupoId(null)} className="text-[11px] text-muted-foreground shrink-0">X</button>
                          </>
                        ) : (
                          <>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold truncate">{g.nome}</p>
                              <p className="text-[10px] text-muted-foreground truncate font-mono">{g.grupoId}</p>
                            </div>
                            <button onClick={() => { setEditandoGrupoId(g.grupoId); setNomeGrupoEditado(g.nome); }} className="shrink-0 text-muted-foreground hover:text-accent">
                              <Pencil size={12} />
                            </button>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-card border border-border rounded-lg p-3">
                  <p className="text-xs font-bold text-accent mb-2">Grupos — Rio de Janeiro (escolha 1)</p>
                  <div className="space-y-1.5">
                    {grupos.filter((g) => g.regiao === "rio").map((g) => (
                      <div key={g.grupoId} className="flex items-center gap-2 bg-white/5 rounded-lg px-2 py-1.5">
                        <input type="radio" name="grupoRio" checked={grupoRio === g.grupoId} onChange={() => setGrupoRio(g.grupoId)} />
                        {editandoGrupoId === g.grupoId ? (
                          <>
                            <input value={nomeGrupoEditado} onChange={(e) => setNomeGrupoEditado(e.target.value)} autoFocus
                              className="flex-1 bg-white/5 border border-white/10 rounded h-7 px-1.5 text-xs" />
                            <button onClick={() => salvarNomeGrupo(g.grupoId)} className="text-[11px] text-accent shrink-0">Salvar</button>
                            <button onClick={() => setEditandoGrupoId(null)} className="text-[11px] text-muted-foreground shrink-0">X</button>
                          </>
                        ) : (
                          <>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold truncate">{g.nome}</p>
                              <p className="text-[10px] text-muted-foreground truncate font-mono">{g.grupoId}</p>
                            </div>
                            <button onClick={() => { setEditandoGrupoId(g.grupoId); setNomeGrupoEditado(g.nome); }} className="shrink-0 text-muted-foreground hover:text-accent">
                              <Pencil size={12} />
                            </button>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-card border border-border rounded-lg p-3 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-accent">Instâncias do WhatsApp (10 vagas)</p>
                  <button onClick={salvarInstancias} disabled={salvandoInstancias}
                    className="h-7 px-3 rounded-lg bg-accent text-white text-[11px] font-semibold disabled:opacity-60">
                    {salvandoInstancias ? "Salvando..." : "Salvar Instâncias"}
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {instancias.map((inst, idx) => (
                    <label key={idx} className={`flex items-center gap-1.5 bg-white/5 rounded-lg px-2 py-1.5 ${instanciaEscolhida === inst.instancia && inst.instancia ? "border border-accent" : ""}`}>
                      <input type="radio" name="instanciaEscolhida" checked={instanciaEscolhida === inst.instancia && !!inst.instancia}
                        onChange={() => inst.instancia && setInstanciaEscolhida(inst.instancia)} disabled={!inst.instancia} />
                      <input value={inst.nome} onChange={(e) => atualizarInstancia(idx, "nome", e.target.value)} placeholder="Nome"
                        className="w-24 bg-transparent text-xs outline-none" />
                      <input value={inst.instancia} onChange={(e) => atualizarInstancia(idx, "instancia", e.target.value)} placeholder="nome_da_instancia"
                        className="flex-1 min-w-0 bg-transparent text-xs outline-none font-mono" />
                    </label>
                  ))}
                </div>
                {msgInstancias && <p className="text-xs mt-2">{msgInstancias}</p>}
              </div>

              <button onClick={disparar} disabled={disparando} className="w-full h-12 rounded-lg bg-accent text-white font-bold disabled:opacity-60">
                🚀 Disparar {selecionados.size} lead(s) selecionado(s)
              </button>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
