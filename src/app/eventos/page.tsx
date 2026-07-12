"use client";

import { useEffect, useState } from "react";
import { Sidebar, TopBar, BellButton } from "@/components/Sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { chamarApi, getSessao } from "@/lib/sessao";
import { ArrowLeft, Plus, X, Calendar, Clock, Users, Video } from "lucide-react";

type Evento = {
  id: string; titulo: string; tipo: string; descricao: string;
  dataFormatada: string; horario: string; recorrencia: string;
  totalConvidados: number; confirmados: number; passado: boolean;
  ehHoje: boolean; diasRestantes: number; meuStatus: string; linkJitsi?: string;
};

const CARGOS = ["vendedor", "gerente", "gestor"];
const LOJAS = ["Salinas","Atlântica","União Motos","Vision","Maré Motos","Muralha","Império","Confort","PQD Motos","Rio das Ostras","Infinity"];

export default function EventosPage() {
  const sessao = getSessao();
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [criando, setCriando] = useState(false);

  const carregar = () => {
    setCarregando(true);
    chamarApi({ acao: "ev_listar", solicitante: sessao?.nome, cargo: sessao?.cargo }).then((data) => {
      if (data && data.ok) {
        setEventos(data.eventos || []);
        setErro("");
      } else {
        setErro((data && data.erro) || "Erro ao carregar eventos.");
      }
      setCarregando(false);
    });
  };
  useEffect(() => { carregar(); }, []);

  const responder = async (id: string, resposta: "confirmado" | "recusado") => {
    await chamarApi({ acao: "ev_responder", id, resposta, solicitante: sessao?.nome });
    carregar();
  };

  const proximos = eventos.filter((e) => !e.passado);
  const anteriores = eventos.filter((e) => e.passado);

  return (
    <main className="min-h-screen bg-background text-foreground px-4 py-8 md:px-10">
      <BellButton />
      <TopBar />
      <div className="flex flex-col md:flex-row gap-8">
        <Sidebar nomeUsuario={sessao?.nome} />
        <div className="flex-1">
          <div className="flex items-center justify-between mb-4">
            <a href="/" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-accent transition-colors">
              <ArrowLeft size={15} /> Voltar ao Rank
            </a>
            {sessao?.cargo === "gestor" && (
              <button onClick={() => setCriando(true)} className="h-10 px-4 rounded-lg bg-accent text-white font-bold text-sm flex items-center gap-2">
                <Plus size={15} /> Criar Evento
              </button>
            )}
          </div>
          <h1 className="text-3xl md:text-4xl font-black mb-6">Eventos</h1>

          {erro && <p className="text-accent mb-4">❌ {erro}</p>}
          {carregando && <p className="text-muted-foreground">Carregando...</p>}

          <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-2">Próximos Eventos</p>
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
            {proximos.map((ev) => (
              <Card key={ev.id} className="border-border">
                <CardContent className="py-4">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase mb-1">
                    <Video size={12} /> {ev.tipo}
                  </div>
                  <p className="font-bold text-lg">{ev.titulo}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground my-2">
                    <span className="flex items-center gap-1"><Calendar size={11} /> {ev.dataFormatada}</span>
                    <span className="flex items-center gap-1"><Clock size={11} /> {ev.horario}</span>
                  </div>
                  {ev.descricao && <p className="text-sm text-muted-foreground mb-2">{ev.descricao}</p>}
                  <p className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
                    <Users size={11} /> {ev.totalConvidados} convidado(s) · {ev.confirmados} confirmado(s)
                  </p>
                  {ev.meuStatus === "confirmado" ? (
                    <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full">✓ Confirmado</span>
                  ) : (
                    <div className="flex gap-2">
                      <button onClick={() => responder(ev.id, "confirmado")} className="flex-1 h-8 rounded-lg bg-accent text-white text-xs font-semibold">Confirmar</button>
                      <button onClick={() => responder(ev.id, "recusado")} className="flex-1 h-8 rounded-lg bg-white/5 border border-white/10 text-xs">Recusar</button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
            {!carregando && proximos.length === 0 && (
              <p className="text-muted-foreground text-sm col-span-full">Nenhum evento agendado.</p>
            )}
          </div>

          <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-2">Eventos Anteriores</p>
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {anteriores.map((ev) => (
              <Card key={ev.id} className="border-border opacity-60">
                <CardContent className="py-4">
                  <p className="font-bold">{ev.titulo}</p>
                  <p className="text-xs text-muted-foreground">{ev.dataFormatada} às {ev.horario}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {criando && <CriarEventoModal onClose={() => setCriando(false)} onSalvo={carregar} sessao={sessao} />}
    </main>
  );
}

function CriarEventoModal({ onClose, onSalvo, sessao }: { onClose: () => void; onSalvo: () => void; sessao: any }) {
  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState("meeting");
  const [descricao, setDescricao] = useState("");
  const [data, setData] = useState("");
  const [horario, setHorario] = useState("09:00");
  const [recorrencia, setRecorrencia] = useState("unico");
  const [lojas, setLojas] = useState<string[]>([]);
  const [cargos, setCargos] = useState<Record<string, boolean>>({});
  const [disparoAuto, setDisparoAuto] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState("");

  const salvar = async () => {
    if (!titulo || !data) { setMsg("❌ Preencha título e data."); return; }
    setSalvando(true);
    const cargosMap: Record<string, boolean> = {};
    Object.keys(cargos).forEach((c) => { if (cargos[c]) cargosMap[c] = true; });
    const data_ = await chamarApi({
      acao: "ev_salvar", titulo, tipo, descricao, data, horario, recorrencia,
      lojas, cargos: cargosMap, disparoAuto, solicitante: sessao?.nome,
    });
    if (data_ && data_.ok) { onSalvo(); onClose(); }
    else setMsg("❌ " + ((data_ && data_.erro) || "Erro ao salvar."));
    setSalvando(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-card border border-border rounded-2xl max-w-lg w-full my-8 p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground"><X size={20} /></button>
        <h2 className="text-2xl font-black mb-4">CRIAR <span className="text-accent">EVENTO</span></h2>
        <div className="space-y-3">
          <input placeholder="Título" value={titulo} onChange={(e) => setTitulo(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg h-10 px-3 text-sm" />
          <div className="grid grid-cols-2 gap-3">
            <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg h-10 px-3 text-sm">
              <option value="meeting">🎥 Meeting</option>
              <option value="presencial">📍 Presencial</option>
              <option value="outro">📋 Outro</option>
            </select>
            <select value={recorrencia} onChange={(e) => setRecorrencia(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg h-10 px-3 text-sm">
              <option value="unico">Único</option>
              <option value="semanal">Semanal</option>
              <option value="quinzenal">Quinzenal</option>
              <option value="mensal">Mensal</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input type="date" value={data} onChange={(e) => setData(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg h-10 px-3 text-sm" />
            <input type="time" value={horario} onChange={(e) => setHorario(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg h-10 px-3 text-sm" />
          </div>
          <textarea placeholder="Pauta / descrição" value={descricao} onChange={(e) => setDescricao(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm h-20" />

          <p className="text-xs font-bold text-accent">Convidados por cargo</p>
          <div className="flex gap-3">
            {CARGOS.map((c) => (
              <label key={c} className="flex items-center gap-1.5 text-sm capitalize">
                <input type="checkbox" checked={!!cargos[c]} onChange={(e) => setCargos((cs) => ({ ...cs, [c]: e.target.checked }))} />
                {c}s
              </label>
            ))}
          </div>

          <p className="text-xs font-bold text-accent">Convidados por loja</p>
          <select multiple value={lojas} onChange={(e) => setLojas(Array.from(e.target.selectedOptions, (o) => o.value))}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm h-24">
            {LOJAS.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={disparoAuto} onChange={(e) => setDisparoAuto(e.target.checked)} />
            📡 Disparar convite automaticamente ao salvar
          </label>

          {msg && <p className="text-sm">{msg}</p>}
          <button onClick={salvar} disabled={salvando} className="w-full h-11 rounded-lg bg-accent text-white font-bold text-sm disabled:opacity-60">
            {salvando ? "Salvando..." : "💾 SALVAR EVENTO"}
          </button>
        </div>
      </div>
    </div>
  );
}
