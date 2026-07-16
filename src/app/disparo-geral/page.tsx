"use client";

import { useEffect, useState } from "react";
import { Sidebar, TopBar, BellButton } from "@/components/Sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { getSessao, chamarApi } from "@/lib/sessao";
import { ArrowLeft, Lock, Send, Users, RefreshCw, Trash2, Sunrise } from "lucide-react";

type Pessoa = { nome: string; email: string; telefone: string; cargo: string; loja: string };
type DisparoAgendado = { id: number; nome: string; cargo: string; recorrencia: string; horario: string; texto: string; ativo: boolean };

const CARGOS = ["todos", "vendedor", "gerente", "gestor"];
const RECORRENCIAS = [
  { valor: "unico", nome: "Único (dispara uma vez)" },
  { valor: "diario", nome: "Diário (seg a sáb)" },
  { valor: "semanal", nome: "Semanal (toda segunda)" },
];
const HORARIOS_JANELA = ["08:30", "14:00", "18:00"];

export default function DisparoGeralPage() {
  const sessao = getSessao();
  const ehGestor = sessao?.cargo === "gestor";
  const [desbloqueado, setDesbloqueado] = useState(false);
  const [senhaInput, setSenhaInput] = useState("");
  const [erroSenha, setErroSenha] = useState("");
  const [validandoSenha, setValidandoSenha] = useState(false);

  // Bot de Bom Dia
  const [autoAtivo, setAutoAtivo] = useState(false);
  const [horaInicio, setHoraInicio] = useState("08:00");
  const [horaFim, setHoraFim] = useState("18:00");
  const [salvandoConfig, setSalvandoConfig] = useState(false);
  const [disparandoBomDia, setDisparandoBomDia] = useState(false);
  const [msgBomDia, setMsgBomDia] = useState("");
  const [mensagensCargo, setMensagensCargo] = useState<Record<string, string>>({ vendedor: "", gerente: "", gestor: "" });
  const [cargoEditando, setCargoEditando] = useState<"vendedor" | "gerente" | "gestor">("vendedor");
  const [salvandoMensagem, setSalvandoMensagem] = useState(false);
  const [msgMensagem, setMsgMensagem] = useState("");

  // Disparos agendados
  const [agendados, setAgendados] = useState<DisparoAgendado[]>([]);
  const [novoNome, setNovoNome] = useState("");
  const [novoCargo, setNovoCargo] = useState("todos");
  const [novaRecorrencia, setNovaRecorrencia] = useState("unico");
  const [novoHorario, setNovoHorario] = useState("08:30");
  const [novoTexto, setNovoTexto] = useState("");
  const [salvandoAgendado, setSalvandoAgendado] = useState(false);
  const [msgAgendado, setMsgAgendado] = useState("");
  const [executandoId, setExecutandoId] = useState<number | null>(null);

  // Disparo manual
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [textoManual, setTextoManual] = useState("");
  const [enviandoManual, setEnviandoManual] = useState(false);
  const [msgManual, setMsgManual] = useState("");

  // Sincronizar contatos
  const [sincronizando, setSincronizando] = useState(false);
  const [msgSincronizar, setMsgSincronizar] = useState("");

  const tentarDesbloquear = async () => {
    if (!senhaInput.trim()) return;
    setValidandoSenha(true);
    setErroSenha("");
    const data = await chamarApi({ acao: "rh_validar_senha_master", senhaMaster: senhaInput.trim() });
    if (data && data.ok) setDesbloqueado(true);
    else setErroSenha("❌ Senha incorreta.");
    setValidandoSenha(false);
  };

  const carregarTudo = () => {
    chamarApi({ acao: "disparo_obter_config" }).then((data) => {
      if (data && data.ok) {
        setAutoAtivo(!!data.autoAtivo);
        setHoraInicio(data.horaInicio || "08:00");
        setHoraFim(data.horaFim || "18:00");
      }
    });
    chamarApi({ acao: "disparo_obter_mensagens_bomdia" }).then((data) => {
      if (data && data.ok) setMensagensCargo(data.mensagens || { vendedor: "", gerente: "", gestor: "" });
    });
    chamarApi({ acao: "disparo_listar_agendados" }).then((data) => {
      if (data && data.ok) setAgendados(data.disparos || []);
    });
    chamarApi({ acao: "rh_listar", nomeQuemPede: sessao?.nome }).then((data) => {
      if (data && data.ok) setPessoas((data.pessoas || []).filter((p: Pessoa) => p.telefone));
    });
  };
  useEffect(() => { if (desbloqueado) carregarTudo(); }, [desbloqueado]);

  const salvarConfig = async (novoAuto: boolean) => {
    setSalvandoConfig(true);
    setAutoAtivo(novoAuto);
    await chamarApi({ acao: "disparo_salvar_config", autoAtivo: novoAuto, horaInicio, horaFim });
    setSalvandoConfig(false);
  };

  const salvarHorarios = async () => {
    setSalvandoConfig(true);
    await chamarApi({ acao: "disparo_salvar_config", autoAtivo, horaInicio, horaFim });
    setSalvandoConfig(false);
  };

  const dispararBomDiaAgora = async () => {
    if (!confirm("Confirma o disparo do Bom Dia pra toda a equipe agora?")) return;
    setDisparandoBomDia(true);
    setMsgBomDia("");
    const data = await chamarApi({ acao: "disparo_bom_dia_manual", solicitante: sessao?.nome });
    if (data && data.ok) setMsgBomDia(`✅ Enviado! ${data.enviados || 0} mensagem(ns) disparada(s).`);
    else setMsgBomDia("❌ " + ((data && data.erro) || "Falha no disparo."));
    setDisparandoBomDia(false);
  };

  const salvarMensagemCargo = async () => {
    setSalvandoMensagem(true);
    setMsgMensagem("");
    const data = await chamarApi({
      acao: "disparo_salvar_mensagem_bomdia", cargo: cargoEditando,
      texto: mensagensCargo[cargoEditando] || "",
    });
    if (data && data.ok) setMsgMensagem("✅ Mensagem salva!");
    else setMsgMensagem("❌ " + ((data && data.erro) || "Erro ao salvar."));
    setSalvandoMensagem(false);
  };

  const criarAgendado = async () => {
    if (!novoNome.trim() || !novoTexto.trim()) { setMsgAgendado("❌ Preencha nome e mensagem."); return; }
    setSalvandoAgendado(true);
    setMsgAgendado("");
    const data = await chamarApi({
      acao: "disparo_salvar_agendado", nome: novoNome, cargo: novoCargo, recorrencia: novaRecorrencia,
      horario: novoHorario, texto: novoTexto, ativo: true, solicitante: sessao?.nome,
    });
    if (data && data.ok) {
      setMsgAgendado("✅ Disparo agendado criado!");
      setNovoNome(""); setNovoTexto("");
      carregarTudo();
    } else {
      setMsgAgendado("❌ " + ((data && data.erro) || "Erro ao criar."));
    }
    setSalvandoAgendado(false);
  };

  const executarAgendadoAgora = async (id: number) => {
    if (!confirm("Disparar essa mensagem agora, pra quem se encaixa no cargo escolhido?")) return;
    setExecutandoId(id);
    const data = await chamarApi({ acao: "disparo_executar_agendado", id, solicitante: sessao?.nome });
    if (data && data.ok) alert(`✅ Enviado! ${data.enviados || 0} mensagem(ns) disparada(s).`);
    else alert("❌ " + ((data && data.erro) || "Erro ao disparar."));
    setExecutandoId(null);
  };

  const excluirAgendado = async (id: number) => {
    if (!confirm("Excluir esse disparo agendado?")) return;
    await chamarApi({ acao: "disparo_excluir_agendado", id });
    carregarTudo();
  };

  const alternarSelecionado = (nome: string) => {
    setSelecionados((prev) => {
      const novo = new Set(prev);
      if (novo.has(nome)) novo.delete(nome); else novo.add(nome);
      return novo;
    });
  };

  const enviarManual = async () => {
    if (!textoManual.trim()) { setMsgManual("❌ Escreva a mensagem."); return; }
    if (selecionados.size === 0) { setMsgManual("❌ Selecione ao menos um destinatário."); return; }
    setEnviandoManual(true);
    setMsgManual("");
    const destinatarios = pessoas.filter((p) => selecionados.has(p.nome)).map((p) => ({ nome: p.nome, telefone: p.telefone }));
    const data = await chamarApi({
      acao: "disparo_enviar", destinatarios, mensagem: textoManual, tipo: "manual", solicitante: sessao?.nome,
    });
    if (data && data.ok) {
      setMsgManual(`✅ Enviado pra ${data.enviados} pessoa(s).` + (data.falhas?.length ? ` Falhou: ${data.falhas.join(", ")}` : ""));
    } else {
      setMsgManual("❌ " + ((data && data.erro) || "Erro ao enviar."));
    }
    setEnviandoManual(false);
  };

  const sincronizarContatos = async () => {
    setSincronizando(true);
    setMsgSincronizar("");
    const data = await chamarApi({ acao: "disparo_sincronizar_contatos" });
    if (data && data.ok) {
      setMsgSincronizar(`✅ ${data.atualizados} telefone(s) preenchido(s) — ${data.totalParticipantes} contatos encontrados nos grupos.`);
    } else {
      setMsgSincronizar("❌ " + ((data && data.erro) || "Erro ao sincronizar."));
    }
    setSincronizando(false);
  };

  if (!ehGestor) {
    return (
      <main className="min-h-screen bg-background text-foreground flex items-center justify-center px-4">
        <div className="max-w-sm text-center space-y-3">
          <Lock size={32} className="mx-auto text-muted-foreground" />
          <h1 className="text-xl font-black">Acesso restrito</h1>
          <p className="text-muted-foreground text-sm">O Disparo Geral é visível só para gestores.</p>
          <a href="/financeiro" className="inline-block text-sm text-accent underline">← Voltar ao Financeiro</a>
        </div>
      </main>
    );
  }

  if (!desbloqueado) {
    return (
      <main className="min-h-screen bg-background text-foreground flex items-center justify-center px-4">
        <div className="max-w-sm w-full space-y-3 text-center">
          <Lock size={32} className="mx-auto text-accent" />
          <h1 className="text-xl font-black">Disparo Geral</h1>
          <p className="text-muted-foreground text-sm">Digite a senha master pra entrar.</p>
          <input
            type="password" value={senhaInput} onChange={(e) => setSenhaInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && tentarDesbloquear()}
            placeholder="Senha master" autoComplete="new-password" name="performace-disparogeral-senha"
            className="w-full bg-white/5 border border-white/10 rounded-lg h-11 px-3 text-sm text-center outline-none focus:border-accent"
          />
          {erroSenha && <p className="text-accent text-xs">{erroSenha}</p>}
          <button onClick={tentarDesbloquear} disabled={validandoSenha}
            className="w-full h-11 rounded-lg bg-accent text-white font-bold text-sm disabled:opacity-60">
            {validandoSenha ? "Verificando..." : "Entrar"}
          </button>
          <a href="/financeiro" className="inline-block text-sm text-muted-foreground hover:text-accent underline">← Voltar ao Financeiro</a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground px-4 py-8 md:px-10">
      <BellButton />
      <TopBar />
      <div className="flex flex-col md:flex-row gap-8">
        <Sidebar nomeUsuario={sessao?.nome} />
        <div className="flex-1 max-w-3xl space-y-6">
          <a href="/financeiro" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-accent">
            <ArrowLeft size={15} /> Voltar ao Financeiro
          </a>
          <h1 className="text-3xl md:text-4xl font-black">Disparo <span className="text-accent">Geral</span></h1>

          {/* Bot de Bom Dia */}
          <Card>
            <CardContent className="py-5 space-y-4">
              <p className="text-sm font-bold text-accent flex items-center gap-2"><Sunrise size={16} /> Bot de Bom Dia</p>

              <label className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2.5">
                <span className="text-sm">Ativar disparo automático diário</span>
                <input type="checkbox" checked={autoAtivo} disabled={salvandoConfig} onChange={(e) => salvarConfig(e.target.checked)} className="w-5 h-5" />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Horário início</label>
                  <input type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} onBlur={salvarHorarios}
                    className="w-full bg-white/5 border border-white/10 rounded-lg h-9 px-2 text-sm mt-1" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Horário fim</label>
                  <input type="time" value={horaFim} onChange={(e) => setHoraFim(e.target.value)} onBlur={salvarHorarios}
                    className="w-full bg-white/5 border border-white/10 rounded-lg h-9 px-2 text-sm mt-1" />
                </div>
              </div>

              <button onClick={dispararBomDiaAgora} disabled={disparandoBomDia}
                className="w-full h-10 rounded-lg bg-accent/20 border border-accent/40 text-accent font-semibold text-sm disabled:opacity-60">
                {disparandoBomDia ? "Disparando..." : "🌅 Disparar Agora (toda a equipe)"}
              </button>
              {msgBomDia && <p className="text-sm">{msgBomDia}</p>}

              <div className="border-t border-white/10 pt-3">
                <p className="text-xs font-semibold text-muted-foreground mb-2">Personalizar mensagem por cargo</p>
                <div className="flex gap-2 mb-2">
                  {(["vendedor", "gerente", "gestor"] as const).map((c) => (
                    <button key={c} onClick={() => { setCargoEditando(c); setMsgMensagem(""); }}
                      className={`px-3 h-8 rounded-lg text-xs font-semibold capitalize ${cargoEditando === c ? "bg-accent text-white" : "bg-white/5 border border-white/10"}`}>
                      {c}
                    </button>
                  ))}
                </div>
                <textarea
                  value={mensagensCargo[cargoEditando] || ""}
                  onChange={(e) => setMensagensCargo((m) => ({ ...m, [cargoEditando]: e.target.value }))}
                  placeholder="Deixe em branco pra usar a mensagem automática padrão. Use {nome}, {login}, {senha}, {frase_motivacional}, {metas}."
                  rows={4}
                  className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm outline-none focus:border-accent"
                />
                <button onClick={salvarMensagemCargo} disabled={salvandoMensagem}
                  className="w-full h-9 rounded-lg bg-white/5 border border-white/10 text-sm font-semibold mt-2 hover:border-accent disabled:opacity-60">
                  {salvandoMensagem ? "Salvando..." : `Salvar mensagem de ${cargoEditando}`}
                </button>
                {msgMensagem && <p className="text-sm mt-1">{msgMensagem}</p>}
              </div>
            </CardContent>
          </Card>

          {/* Disparos Agendados */}
          <Card>
            <CardContent className="py-5 space-y-4">
              <p className="text-sm font-bold text-accent">🗓️ Disparos Agendados</p>

              {agendados.length > 0 && (
                <div className="space-y-2">
                  {agendados.map((a) => (
                    <div key={a.id} className="bg-white/5 border border-white/10 rounded-lg p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">{a.nome}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {a.cargo} · {RECORRENCIAS.find((r) => r.valor === a.recorrencia)?.nome || a.recorrencia} · {a.horario} · {a.ativo ? "ativo" : "inativo"}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button onClick={() => executarAgendadoAgora(a.id)} disabled={executandoId === a.id}
                            className="h-8 px-2.5 rounded-lg bg-accent/20 border border-accent/40 text-accent text-xs font-semibold disabled:opacity-60">
                            {executandoId === a.id ? "..." : "Disparar"}
                          </button>
                          <button onClick={() => excluirAgendado(a.id)} className="h-8 w-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:border-accent">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="border-t border-white/10 pt-3 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">Criar novo disparo agendado</p>
                <input value={novoNome} onChange={(e) => setNovoNome(e.target.value)} placeholder="Nome (ex: Cobrança de meta sexta)"
                  className="w-full bg-white/5 border border-white/10 rounded-lg h-9 px-3 text-sm" />
                <div className="grid grid-cols-3 gap-2">
                  <select value={novoCargo} onChange={(e) => setNovoCargo(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg h-9 px-2 text-sm capitalize">
                    {CARGOS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <select value={novaRecorrencia} onChange={(e) => setNovaRecorrencia(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg h-9 px-1 text-xs">
                    {RECORRENCIAS.map((r) => <option key={r.valor} value={r.valor}>{r.nome}</option>)}
                  </select>
                  <select value={novoHorario} onChange={(e) => setNovoHorario(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg h-9 px-2 text-sm">
                    {HORARIOS_JANELA.map((h) => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
                <textarea value={novoTexto} onChange={(e) => setNovoTexto(e.target.value)}
                  placeholder="Mensagem — pode usar {nome}, {login}, {senha}, {frase_motivacional}, {metas}, {vendas_rede}"
                  rows={3} className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm outline-none focus:border-accent" />
                <p className="text-[11px] text-muted-foreground">Janelas fixas de disparo: 08:30, 14:00 e 18:00 (horário de Brasília).</p>
                <button onClick={criarAgendado} disabled={salvandoAgendado}
                  className="w-full h-10 rounded-lg bg-accent text-white font-bold text-sm disabled:opacity-60">
                  {salvandoAgendado ? "Criando..." : "Criar Disparo Agendado"}
                </button>
                {msgAgendado && <p className="text-sm">{msgAgendado}</p>}
              </div>
            </CardContent>
          </Card>

          {/* Disparo Manual */}
          <Card>
            <CardContent className="py-5 space-y-3">
              <p className="text-sm font-bold text-accent flex items-center gap-2"><Send size={16} /> Disparo Manual</p>
              <textarea value={textoManual} onChange={(e) => setTextoManual(e.target.value)}
                placeholder="Mensagem — pode usar {nome}" rows={3}
                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm outline-none focus:border-accent" />

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs text-muted-foreground">Destinatários ({selecionados.size} selecionado(s))</p>
                  <div className="flex gap-2">
                    <button onClick={() => setSelecionados(new Set(pessoas.map((p) => p.nome)))} className="text-xs text-accent underline">Marcar todos</button>
                    <button onClick={() => setSelecionados(new Set())} className="text-xs text-muted-foreground underline">Limpar</button>
                  </div>
                </div>
                <div className="max-h-52 overflow-y-auto bg-white/5 border border-white/10 rounded-lg divide-y divide-white/5">
                  {pessoas.map((p) => (
                    <label key={p.nome} className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-white/5">
                      <input type="checkbox" checked={selecionados.has(p.nome)} onChange={() => alternarSelecionado(p.nome)} />
                      <span className="flex-1 truncate">{p.nome}</span>
                      <span className="text-[10px] text-muted-foreground uppercase">{p.cargo}</span>
                    </label>
                  ))}
                  {pessoas.length === 0 && <p className="text-xs text-muted-foreground p-3">Nenhuma pessoa com telefone cadastrado.</p>}
                </div>
              </div>

              <button onClick={enviarManual} disabled={enviandoManual}
                className="w-full h-10 rounded-lg bg-accent text-white font-bold text-sm disabled:opacity-60">
                {enviandoManual ? "Enviando..." : "📤 Enviar Disparo Manual"}
              </button>
              {msgManual && <p className="text-sm">{msgManual}</p>}
            </CardContent>
          </Card>

          {/* Sincronizar Contatos */}
          <Card>
            <CardContent className="py-5 space-y-2">
              <p className="text-sm font-bold text-accent flex items-center gap-2"><Users size={16} /> Sincronizar Contatos</p>
              <p className="text-xs text-muted-foreground">
                Busca os participantes dos grupos de leads do WhatsApp e preenche automaticamente o telefone de quem já está cadastrado no RH sem telefone.
              </p>
              <button onClick={sincronizarContatos} disabled={sincronizando}
                className="w-full h-10 rounded-lg bg-white/5 border border-white/10 text-sm font-semibold flex items-center justify-center gap-2 hover:border-accent disabled:opacity-60">
                <RefreshCw size={14} className={sincronizando ? "animate-spin" : ""} /> {sincronizando ? "Sincronizando..." : "Sincronizar Agora"}
              </button>
              {msgSincronizar && <p className="text-sm">{msgSincronizar}</p>}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
