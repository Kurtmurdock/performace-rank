"use client";

import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { Sidebar, TopBar, BellButton } from "@/components/Sidebar";
import { chamarApi, getSessao } from "@/lib/sessao";
import { ArrowLeft, Upload, Pencil } from "lucide-react";
import { useConfigVisual } from "@/lib/useConfigVisual";

type Lead = { id: number; nome: string; telefone: string; regiao: "rio" | "lagos" };
const DDDS_RIO = ["21"];

// IDs fixos direto no código — nada mais depende de buscar uma lista do
// backend (o sistema anterior baseado em aba própria travava
// misteriosamente). Só o APELIDO de cada um é salvo/lido do servidor.
const GRUPOS_LAGOS = [
  { id: "120363426289293171@g.us", nomePadrao: "Grupo Lagos 1" },
  { id: "120363423681410822@g.us", nomePadrao: "Atlantica leads" },
  { id: "120363422534407098@g.us", nomePadrao: "Leads Salinas" },
  { id: "120363410239286394@g.us", nomePadrao: "LEADS CAPRI" },
  { id: "120363409341996576@g.us", nomePadrao: "LEADS BANG" },
];
const GRUPOS_RIO = [
  { id: "120363402345757487@g.us", nomePadrao: "LEADS VISION" },
  { id: "120363288601507294@g.us", nomePadrao: "Grupo Rio 2" },
];
const INSTANCIAS_PADRAO = [
  { chave: "atlantica_teste2", nomePadrao: "Atlântica Teste 2" },
  { chave: "atlantica eventos", nomePadrao: "Atlântica Eventos" },
  { chave: "INSTANCIA3", nomePadrao: "Instância 3" },
  { chave: "INSTACIA4", nomePadrao: "Instância 4" },
];

export default function LeadsPage() {
  const sessao = getSessao();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selecionados, setSelecionados] = useState<Set<number>>(new Set());
  const [status, setStatus] = useState("");
  const [disparando, setDisparando] = useState(false);

  // Nomes personalizados (apelido de cada grupo/instância) — vem do
  // servidor numa única chamada simples (chave→nome), sem precisar
  // buscar lista nenhuma. Os IDs em si já estão fixos no código acima.
  const [nomesPersonalizados, setNomesPersonalizados] = useState<Record<string, string>>({});
  const [gruposLagosSelecionados, setGruposLagosSelecionados] = useState<Set<string>>(new Set());
  const [gruposRioSelecionados, setGruposRioSelecionados] = useState<Set<string>>(new Set());
  const [instanciaEscolhida, setInstanciaEscolhida] = useState("atlantica eventos");
  const [editandoChave, setEditandoChave] = useState<string | null>(null);
  const [nomeEditado, setNomeEditado] = useState("");

  useEffect(() => {
    chamarApi({ acao: "evo_obter_nomes_personalizados" }).then((data) => {
      if (data && data.ok) setNomesPersonalizados(data.nomes || {});
    });
  }, []);

  const nomeExibido = (chave: string, nomePadrao: string) => nomesPersonalizados[chave] || nomePadrao;

  const salvarNome = async (chave: string) => {
    if (!nomeEditado.trim()) return;
    await chamarApi({ acao: "evo_salvar_nome_personalizado", chave, nome: nomeEditado.trim() });
    setNomesPersonalizados((n) => ({ ...n, [chave]: nomeEditado.trim() }));
    setEditandoChave(null);
  };

  const alternarGrupo = (regiao: "lagos" | "rio", id: string) => {
    const setter = regiao === "lagos" ? setGruposLagosSelecionados : setGruposRioSelecionados;
    setter((prev) => {
      const novo = new Set(prev);
      novo.has(id) ? novo.delete(id) : novo.add(id);
      return novo;
    });
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
    let falhasTotal = 0;
    const primeirosErros: string[] = [];
    const TAMANHO_LOTE = 50;
    for (let i = 0; i < escolhidos.length; i += TAMANHO_LOTE) {
      const lote = escolhidos.slice(i, i + TAMANHO_LOTE);
      setStatus(`Enviando... (${enviados}/${escolhidos.length})`);
      const data = await chamarApi({
        acao: "evo_disparar_leads", leads: lote,
        gruposLagos: Array.from(gruposLagosSelecionados),
        gruposRio: Array.from(gruposRioSelecionados),
        instancia: instanciaEscolhida,
      });
      if (data && data.ok) {
        // Bug real corrigido: "0 enviados" é um número válido (tudo falhou),
        // mas "0 || lote.length" em JS trata 0 como vazio e cai no total do
        // lote — escondia falha total mostrando "concluído" enganosamente.
        enviados += data.enviados ?? 0;
        if (data.falhas?.length) {
          falhasTotal += data.falhas.length;
          data.falhas.slice(0, 3).forEach((f: { nome: string; erro: string }) => primeirosErros.push(`${f.nome}: ${f.erro}`));
        }
      } else {
        setStatus("❌ " + ((data && data.erro) || "Erro no disparo."));
        setDisparando(false);
        return;
      }
    }
    if (falhasTotal > 0) {
      setStatus(`⚠️ ${enviados} enviados, ${falhasTotal} falharam. Exemplos: ${primeirosErros.join(" | ")}`);
    } else {
      setStatus(`✅ Concluído (${enviados} enviados)`);
    }
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
                  <p className="text-xs font-bold text-accent mb-2">Grupos — Lagos (marque um ou mais)</p>
                  <div className="space-y-1.5">
                    {GRUPOS_LAGOS.map((g) => (
                      <div key={g.id} className="flex items-center gap-2 bg-white/5 rounded-lg px-2 py-1.5">
                        <input type="checkbox" checked={gruposLagosSelecionados.has(g.id)} onChange={() => alternarGrupo("lagos", g.id)} />
                        {editandoChave === g.id ? (
                          <>
                            <input value={nomeEditado} onChange={(e) => setNomeEditado(e.target.value)} autoFocus
                              className="flex-1 bg-white/5 border border-white/10 rounded h-7 px-1.5 text-xs" />
                            <button onClick={() => salvarNome(g.id)} className="text-[11px] text-accent shrink-0">Salvar</button>
                            <button onClick={() => setEditandoChave(null)} className="text-[11px] text-muted-foreground shrink-0">X</button>
                          </>
                        ) : (
                          <>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold truncate">{nomeExibido(g.id, g.nomePadrao)}</p>
                              <p className="text-[10px] text-muted-foreground truncate font-mono">{g.id}</p>
                            </div>
                            <button onClick={() => { setEditandoChave(g.id); setNomeEditado(nomeExibido(g.id, g.nomePadrao)); }} className="shrink-0 text-muted-foreground hover:text-accent">
                              <Pencil size={12} />
                            </button>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-card border border-border rounded-lg p-3">
                  <p className="text-xs font-bold text-accent mb-2">Grupos — Rio de Janeiro (marque um ou mais)</p>
                  <div className="space-y-1.5">
                    {GRUPOS_RIO.map((g) => (
                      <div key={g.id} className="flex items-center gap-2 bg-white/5 rounded-lg px-2 py-1.5">
                        <input type="checkbox" checked={gruposRioSelecionados.has(g.id)} onChange={() => alternarGrupo("rio", g.id)} />
                        {editandoChave === g.id ? (
                          <>
                            <input value={nomeEditado} onChange={(e) => setNomeEditado(e.target.value)} autoFocus
                              className="flex-1 bg-white/5 border border-white/10 rounded h-7 px-1.5 text-xs" />
                            <button onClick={() => salvarNome(g.id)} className="text-[11px] text-accent shrink-0">Salvar</button>
                            <button onClick={() => setEditandoChave(null)} className="text-[11px] text-muted-foreground shrink-0">X</button>
                          </>
                        ) : (
                          <>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold truncate">{nomeExibido(g.id, g.nomePadrao)}</p>
                              <p className="text-[10px] text-muted-foreground truncate font-mono">{g.id}</p>
                            </div>
                            <button onClick={() => { setEditandoChave(g.id); setNomeEditado(nomeExibido(g.id, g.nomePadrao)); }} className="shrink-0 text-muted-foreground hover:text-accent">
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
                <p className="text-xs font-bold text-accent mb-2">Instância do WhatsApp (escolha 1)</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {INSTANCIAS_PADRAO.map((inst) => (
                    <div key={inst.chave} className={`flex items-center gap-2 bg-white/5 rounded-lg px-2 py-1.5 ${instanciaEscolhida === inst.chave ? "border border-accent" : ""}`}>
                      <input type="radio" name="instanciaEscolhida" checked={instanciaEscolhida === inst.chave} onChange={() => setInstanciaEscolhida(inst.chave)} />
                      {editandoChave === inst.chave ? (
                        <>
                          <input value={nomeEditado} onChange={(e) => setNomeEditado(e.target.value)} autoFocus
                            className="flex-1 bg-white/5 border border-white/10 rounded h-7 px-1.5 text-xs" />
                          <button onClick={() => salvarNome(inst.chave)} className="text-[11px] text-accent shrink-0">Salvar</button>
                          <button onClick={() => setEditandoChave(null)} className="text-[11px] text-muted-foreground shrink-0">X</button>
                        </>
                      ) : (
                        <>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold truncate">{nomeExibido(inst.chave, inst.nomePadrao)}</p>
                            <p className="text-[10px] text-muted-foreground truncate font-mono">{inst.chave}</p>
                          </div>
                          <button onClick={() => { setEditandoChave(inst.chave); setNomeEditado(nomeExibido(inst.chave, inst.nomePadrao)); }} className="shrink-0 text-muted-foreground hover:text-accent">
                            <Pencil size={12} />
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
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
