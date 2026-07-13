"use client";

import { useEffect, useState } from "react";
import { Sidebar, TopBar, BellButton } from "@/components/Sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { chamarApi, getSessao } from "@/lib/sessao";
import { ArrowLeft, Plus, Calendar, Clock, Users, Video, Paperclip, MoreVertical, Pencil, Send, Trash2 } from "lucide-react";
import { EventoFormModal } from "@/components/EventoFormModal";
import { SalaEsperaModal } from "@/components/SalaEsperaModal";

type Evento = {
  id: string; titulo: string; tipo: string; descricao: string;
  dataISO: string; dataFormatada: string; horario: string; recorrencia: string;
  totalConvidados: number; confirmados: number; passado: boolean;
  ehHoje: boolean; diasRestantes: number; meuStatus: string; linkJitsi?: string;
  materiais?: { url: string; nome?: string }[];
};

export default function EventosPage() {
  const sessao = getSessao();
  const ehGestor = sessao?.cargo === "gestor";

  const [eventos, setEventos] = useState<Evento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [formAberto, setFormAberto] = useState(false);
  const [eventoEditando, setEventoEditando] = useState<Evento | null>(null);
  const [salaAberta, setSalaAberta] = useState<Evento | null>(null);
  const [menuAbertoId, setMenuAbertoId] = useState<string | null>(null);

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

  const dispararConvite = async (id: string) => {
    setMenuAbertoId(null);
    await chamarApi({ acao: "ev_disparar_convite", id, solicitante: sessao?.nome });
    alert("Convite disparado novamente!");
  };

  const cancelarEvento = async (evento: Evento) => {
    setMenuAbertoId(null);
    const serie = evento.recorrencia !== "unico"
      ? confirm("Este evento se repete. Cancelar a SÉRIE inteira? (Cancelar = só esta ocorrência)")
      : false;
    if (!confirm(serie ? "Cancelar a série inteira?" : "Cancelar este evento?")) return;
    await chamarApi({ acao: "ev_cancelar", id: evento.id, tipo: serie ? "serie" : "ocorrencia", solicitante: sessao?.nome });
    carregar();
  };

  const abrirMateriais = (evento: Evento) => {
    (evento.materiais || []).forEach((m) => window.open(m.url, "_blank"));
  };

  const proximos = eventos.filter((e) => !e.passado);
  const anteriores = eventos.filter((e) => e.passado);

  const CardEvento = ({ ev }: { ev: Evento }) => {
    const badge =
      ev.ehHoje ? { texto: "HOJE", cor: "bg-green-500/20 text-green-400" } :
      ev.diasRestantes <= 3 && !ev.passado ? { texto: "EM BREVE", cor: "bg-orange-500/20 text-orange-400" } :
      ev.meuStatus === "pendente" && !ev.passado ? { texto: "⏳ CONFIRMAR", cor: "bg-red-500/20 text-red-400" } :
      null;

    return (
      <Card className="border-border relative">
        <CardContent className="py-4">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase">
              <Video size={12} /> {ev.tipo}
            </div>
            <div className="flex items-center gap-2">
              {badge && <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${badge.cor}`}>{badge.texto}</span>}
              {ehGestor && (
                <div className="relative">
                  <button onClick={() => setMenuAbertoId(menuAbertoId === ev.id ? null : ev.id)}
                    className="text-muted-foreground hover:text-foreground">
                    <MoreVertical size={16} />
                  </button>
                  {menuAbertoId === ev.id && (
                    <div className="absolute right-0 top-6 z-20 bg-card border border-border rounded-lg shadow-lg w-44 py-1 text-sm">
                      <button onClick={() => { setEventoEditando(ev); setMenuAbertoId(null); }}
                        className="w-full text-left px-3 py-2 hover:bg-white/5 flex items-center gap-2">
                        <Pencil size={13} /> Editar
                      </button>
                      <button onClick={() => dispararConvite(ev.id)}
                        className="w-full text-left px-3 py-2 hover:bg-white/5 flex items-center gap-2">
                        <Send size={13} /> Disparar convite
                      </button>
                      <button onClick={() => cancelarEvento(ev)}
                        className="w-full text-left px-3 py-2 hover:bg-white/5 flex items-center gap-2 text-red-400">
                        <Trash2 size={13} /> Cancelar
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
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
            <span className="inline-block text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full mb-2">✓ Confirmado</span>
          ) : !ev.passado ? (
            <div className="flex gap-2 mb-2">
              <button onClick={() => responder(ev.id, "confirmado")} className="flex-1 h-8 rounded-lg bg-accent text-white text-xs font-semibold">Confirmar</button>
              <button onClick={() => responder(ev.id, "recusado")} className="flex-1 h-8 rounded-lg bg-white/5 border border-white/10 text-xs">Recusar</button>
            </div>
          ) : null}

          <div className="flex gap-2">
            {ev.tipo === "meeting" && !ev.passado && (
              <button onClick={() => setSalaAberta(ev)}
                className="flex-1 h-8 rounded-lg bg-accent/20 border border-accent/40 text-accent text-xs font-semibold flex items-center justify-center gap-1.5">
                <Video size={12} /> Sala
              </button>
            )}
            {!!ev.materiais?.length && (
              <button onClick={() => abrirMateriais(ev)}
                className="h-8 px-3 rounded-lg bg-white/5 border border-white/10 text-xs font-semibold flex items-center gap-1.5">
                <Paperclip size={12} /> {ev.materiais.length}
              </button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

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
            {ehGestor && (
              <button onClick={() => setFormAberto(true)} className="h-10 px-4 rounded-lg bg-accent text-white font-bold text-sm flex items-center gap-2">
                <Plus size={15} /> Criar Evento
              </button>
            )}
          </div>
          <h1 className="text-3xl md:text-4xl font-black mb-6">Eventos</h1>

          {erro && <p className="text-accent mb-4">❌ {erro}</p>}
          {carregando && <p className="text-muted-foreground">Carregando...</p>}

          <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-2">Próximos Eventos</p>
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
            {proximos.map((ev) => <CardEvento key={ev.id} ev={ev} />)}
            {!carregando && proximos.length === 0 && (
              <p className="text-muted-foreground text-sm col-span-full">Nenhum evento agendado.</p>
            )}
          </div>

          {ehGestor && (
            <>
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
                {anteriores.length === 0 && (
                  <p className="text-muted-foreground text-sm col-span-full">Nenhum evento anterior.</p>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {(formAberto || eventoEditando) && (
        <EventoFormModal
          evento={eventoEditando || undefined}
          onClose={() => { setFormAberto(false); setEventoEditando(null); }}
          onSalvo={carregar}
        />
      )}

      {salaAberta && (
        <SalaEsperaModal
          eventoId={salaAberta.id}
          titulo={salaAberta.titulo}
          dataISO={salaAberta.dataISO}
          horario={salaAberta.horario}
          onClose={() => setSalaAberta(null)}
        />
      )}
    </main>
  );
}
