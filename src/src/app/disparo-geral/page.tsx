"use client";

import { useEffect, useState } from "react";
import { Sidebar, TopBar, BellButton } from "@/components/Sidebar";
import { chamarApi, getSessao } from "@/lib/sessao";
import { ArrowLeft } from "lucide-react";

type Pessoa = { nome: string; telefone?: string; cargo?: string; loja?: string };
type Disparo = { id: string; nome: string; cargo: string; recorrencia: string; horario: string; texto: string; ativo: boolean };

const BOM_DIA_PADRAO: Record<string, string> = {
  vendedor:
    "Bom dia, {nome}! 🔥\n\n🗓️ *NOVO DIA, NOVA CHANCE DE SER CAMPEÃO!*\n\n{frase_motivacional}\n\n{metas}\n\n" +
    "⚠️ *ATENÇÃO — SEU CADASTRO PRECISA ESTAR COMPLETO!*\nUm cadastro incompleto te deixa FORA do ranking.\n\n" +
    "✅ Acesse agora:\n🔗 {site}\n👤 Login: {login}\n🔑 Senha: {senha}",
  gerente:
    "Bom dia, {nome}! 🔥\n\n🗓️ *SEU TIME PRECISA DE VOCÊ!*\n\n{frase_motivacional}\n\n{metas}\n\n" +
    "⚠️ Garanta que seus vendedores estejam com cadastro completo.\n\n" +
    "✅ Acesse agora:\n🔗 {site}\n👤 Login: {login}\n🔑 Senha: {senha}",
  gestor:
    "Bom dia, {nome}! 🔥\n\n🗓️ *HORA DE LIDERAR!*\n\n{vendas_rede}\n\n{metas}\n\n" +
    "⚠️ Garanta que TODOS da rede estejam com cadastro completo.\n\n" +
    "✅ Acesse agora:\n🔗 {site}\n👤 Login: {login}\n🔑 Senha: {senha}",
};

export default function DisparoGeralPage() {
  const sessao = getSessao();
  const [aba, setAba] = useState<"manual" | "bomdia" | "agendados">("manual");

  // ── Manual ──
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [selecionados, setSelecionados] = useState<Record<string, boolean>>({});
  const [textoManual, setTextoManual] = useState("");
  const [preview, setPreview] = useState("");
  const [logManual, setLogManual] = useState("");

  // ── Bom Dia ──
  const [cargoEditando, setCargoEditando] = useState<"vendedor" | "gerente" | "gestor">("vendedor");
  const [textosBomDia, setTextosBomDia] = useState<Record<string, string>>({});
  const [logBomDia, setLogBomDia] = useState("");

  // ── Agendados ──
  const [disparos, setDisparos] = useState<Disparo[]>([]);
  const [ndNome, setNdNome] = useState("");
  const [ndCargo, setNdCargo] = useState("vendedor");
  const [ndRecorrencia, setNdRecorrencia] = useState("diario");
  const [ndHorario, setNdHorario] = useState("08:30");
  const [ndTexto, setNdTexto] = useState("");
  const [ndAtivo, setNdAtivo] = useState(true);
  const [logAgendados, setLogAgendados] = useState("");

  useEffect(() => {
    chamarApi({ acao: "rh_listar", nomeQuemPede: sessao?.nome }).then((data) => {
      if (data && data.ok) setPessoas(data.pessoas || []);
    });
    chamarApi({ acao: "disparo_obter_mensagens_bomdia" }).then((data) => {
      if (data && data.ok && data.mensagens) {
        setTextosBomDia({
          vendedor: data.mensagens.vendedor || BOM_DIA_PADRAO.vendedor,
          gerente: data.mensagens.gerente || BOM_DIA_PADRAO.gerente,
          gestor: data.mensagens.gestor || BOM_DIA_PADRAO.gestor,
        });
      } else {
        setTextosBomDia(BOM_DIA_PADRAO);
      }
    });
    carregarAgendados();
  }, []);

  const carregarAgendados = () => {
    chamarApi({ acao: "disparo_listar_agendados" }).then((data) => {
      if (data && data.ok) setDisparos(data.disparos || []);
    });
  };

  const porLoja: Record<string, Pessoa[]> = {};
  pessoas.forEach((p) => {
    const loja = p.loja || "Sem Loja";
    if (!porLoja[loja]) porLoja[loja] = [];
    porLoja[loja].push(p);
  });

  const marcarLoja = (loja: string, marcar: boolean) => {
    const novo = { ...selecionados };
    (porLoja[loja] || []).forEach((p) => (novo[p.nome] = marcar));
    setSelecionados(novo);
  };

  const getSelecionados = () => pessoas.filter((p) => selecionados[p.nome]);

  const verPreview = () => {
    const sel = getSelecionados();
    if (!textoManual.trim()) { alert("Digite uma mensagem antes de ver o preview."); return; }
    if (!sel.length) { alert("Selecione pelo menos um destinatário."); return; }
    const exemplo = sel[0];
    const msgExemplo = textoManual.replace(/\{nome\}/gi, exemplo.nome);
    setPreview(`📋 PREVIEW (${sel.length} destinatário${sel.length !== 1 ? "s" : ""}):\n\n${msgExemplo}\n\n[+${sel.length - 1} outros com nome personalizado]`);
  };

  const testar = async () => {
    if (!textoManual.trim()) { alert("Digite uma mensagem."); return; }
    setLogManual("🧪 Enviando teste para você...\n");
    const data = await chamarApi({
      acao: "disparo_enviar",
      destinatarios: [{ nome: sessao?.nome, telefone: "" }],
      mensagem: textoManual, tipo: "teste", solicitante: sessao?.nome,
    });
    setLogManual((l) => l + (data && data.ok ? "✅ Teste enviado!\n" : "❌ Erro: " + ((data && data.erro) || "desconhecido") + "\n"));
  };

  const enviarManual = async () => {
    const sel = getSelecionados();
    if (!textoManual.trim()) { alert("Digite uma mensagem."); return; }
    if (!sel.length) { alert("Selecione pelo menos um destinatário."); return; }
    if (!confirm(`Confirma o disparo para ${sel.length} pessoa(s)?`)) return;
    setLogManual(`🚀 Disparando para ${sel.length} pessoas...\n`);
    const data = await chamarApi({
      acao: "disparo_enviar",
      destinatarios: sel.map((p) => ({ nome: p.nome, telefone: p.telefone })),
      mensagem: textoManual, tipo: "manual", solicitante: sessao?.nome,
    });
    if (data && data.ok) {
      setLogManual((l) => l + `✅ Enviado para ${data.enviados || 0} pessoa(s).\n` + (data.falhas?.length ? `⚠️ Falhas: ${data.falhas.join(", ")}\n` : ""));
    } else {
      setLogManual((l) => l + "❌ Erro: " + ((data && data.erro) || "desconhecido") + "\n");
    }
  };

  const salvarBomDia = async () => {
    setLogBomDia("💾 Salvando...\n");
    const data = await chamarApi({ acao: "disparo_salvar_mensagem_bomdia", cargo: cargoEditando, texto: textosBomDia[cargoEditando], solicitante: sessao?.nome });
    setLogBomDia((l) => l + (data && data.ok ? "✅ Mensagem salva com sucesso!\n" : "❌ Erro: " + ((data && data.erro) || "desconhecido") + "\n"));
  };

  const restaurarPadrao = () => {
    if (!confirm(`Restaurar mensagem padrão para ${cargoEditando}? O texto editado será perdido.`)) return;
    setTextosBomDia((t) => ({ ...t, [cargoEditando]: BOM_DIA_PADRAO[cargoEditando] }));
    setLogBomDia("↺ Texto padrão restaurado.\n");
  };

  const salvarAgendado = async () => {
    if (!ndNome.trim()) { setLogAgendados("❌ Informe o nome do disparo.\n"); return; }
    if (!ndTexto.trim()) { setLogAgendados("❌ Digite a mensagem.\n"); return; }
    setLogAgendados("💾 Salvando disparo...\n");
    const data = await chamarApi({
      acao: "disparo_salvar_agendado",
      nome: ndNome, cargo: ndCargo, recorrencia: ndRecorrencia, horario: ndHorario, texto: ndTexto, ativo: ndAtivo,
      solicitante: sessao?.nome,
    });
    if (data && data.ok) {
      setLogAgendados("✅ Disparo salvo!\n");
      setNdNome(""); setNdTexto("");
      carregarAgendados();
    } else {
      setLogAgendados("❌ Erro: " + ((data && data.erro) || "desconhecido") + "\n");
    }
  };

  const dispararAgora = async (d: Disparo) => {
    if (!confirm(`Disparar "${d.nome}" agora para ${d.cargo}?`)) return;
    setLogAgendados(`🚀 Disparando "${d.nome}"...\n`);
    const data = await chamarApi({ acao: "disparo_executar_agendado", id: d.id, solicitante: sessao?.nome });
    setLogAgendados((l) => l + (data && data.ok ? `✅ Enviado para ${data.enviados || 0} pessoa(s)!\n` : "❌ Erro: " + ((data && data.erro) || "desconhecido") + "\n"));
  };

  const editarAgendado = (d: Disparo) => {
    setNdNome(d.nome); setNdCargo(d.cargo); setNdRecorrencia(d.recorrencia); setNdHorario(d.horario); setNdTexto(d.texto); setNdAtivo(d.ativo);
  };

  const excluirAgendado = async (d: Disparo) => {
    if (!confirm(`Excluir "${d.nome}"?`)) return;
    setLogAgendados("🗑️ Excluindo...\n");
    const data = await chamarApi({ acao: "disparo_excluir_agendado", id: d.id, solicitante: sessao?.nome });
    if (data && data.ok) { setLogAgendados("✅ Excluído!\n"); carregarAgendados(); }
    else setLogAgendados("❌ Erro: " + ((data && data.erro) || "desconhecido") + "\n");
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
        <div className="flex-1 max-w-3xl">
          <a href="/" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-accent mb-4"><ArrowLeft size={15} /> Voltar ao Rank</a>
          <h1 className="text-3xl md:text-4xl font-black mb-6">📤 Disparo <span className="text-accent">Geral</span></h1>

          <div className="flex gap-2 mb-6">
            <button onClick={() => setAba("manual")} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${aba === "manual" ? "bg-accent text-white" : "bg-white/5 text-muted-foreground"}`}>Disparo Manual</button>
            <button onClick={() => setAba("bomdia")} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${aba === "bomdia" ? "bg-accent text-white" : "bg-white/5 text-muted-foreground"}`}>Bot Bom Dia</button>
            <button onClick={() => setAba("agendados")} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${aba === "agendados" ? "bg-accent text-white" : "bg-white/5 text-muted-foreground"}`}>Agendados</button>
          </div>

          {aba === "manual" && (
            <div className="space-y-4">
              <textarea value={textoManual} onChange={(e) => setTextoManual(e.target.value)} placeholder="Digite a mensagem (use {nome} pra personalizar)"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm h-24" />

              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-2">Destinatários por loja</p>
                <div className="grid sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto">
                  {Object.keys(porLoja).sort().map((loja) => (
                    <div key={loja} className="bg-card border border-border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="font-semibold text-xs">{loja}</p>
                        <button onClick={() => marcarLoja(loja, true)} className="text-[10px] text-accent underline">✓ Todos</button>
                      </div>
                      {porLoja[loja].map((p) => (
                        <label key={p.nome} className="flex items-center gap-1.5 text-xs py-0.5">
                          <input type="checkbox" checked={!!selecionados[p.nome]} onChange={(e) => setSelecionados((s) => ({ ...s, [p.nome]: e.target.checked }))} />
                          {p.nome} <span className="text-muted-foreground">({p.cargo})</span>
                        </label>
                      ))}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">{Object.values(selecionados).filter(Boolean).length} selecionado(s)</p>
              </div>

              <div className="flex gap-2">
                <button onClick={verPreview} className="h-9 px-3 rounded-lg bg-white/5 border border-white/10 text-xs font-semibold">👁 Preview</button>
                <button onClick={testar} className="h-9 px-3 rounded-lg bg-white/5 border border-white/10 text-xs font-semibold">🧪 Testar (só eu)</button>
                <button onClick={enviarManual} className="h-9 px-4 rounded-lg bg-accent text-white text-xs font-bold">🚀 Disparar</button>
              </div>
              {preview && <pre className="bg-white/5 border border-white/10 rounded-lg p-3 text-xs whitespace-pre-wrap">{preview}</pre>}
              {logManual && <pre className="text-xs whitespace-pre-wrap">{logManual}</pre>}
            </div>
          )}

          {aba === "bomdia" && (
            <div className="space-y-3">
              <div className="flex gap-2">
                {(["vendedor", "gerente", "gestor"] as const).map((c) => (
                  <button key={c} onClick={() => setCargoEditando(c)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize ${cargoEditando === c ? "bg-accent text-white" : "bg-white/5 text-muted-foreground"}`}>{c}</button>
                ))}
              </div>
              <textarea
                value={textosBomDia[cargoEditando] || ""}
                onChange={(e) => setTextosBomDia((t) => ({ ...t, [cargoEditando]: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs h-64 font-mono"
              />
              <p className="text-xs text-muted-foreground">Variáveis: {"{nome} {frase_motivacional} {metas} {vendas_rede} {site} {login} {senha}"}</p>
              <div className="flex gap-2">
                <button onClick={restaurarPadrao} className="h-9 px-3 rounded-lg bg-white/5 border border-white/10 text-xs font-semibold">↺ Restaurar Padrão</button>
                <button onClick={salvarBomDia} className="h-9 px-4 rounded-lg bg-accent text-white text-xs font-bold">💾 Salvar</button>
              </div>
              {logBomDia && <pre className="text-xs whitespace-pre-wrap">{logBomDia}</pre>}
            </div>
          )}

          {aba === "agendados" && (
            <div className="space-y-6">
              <div className="space-y-2">
                {disparos.length === 0 && <p className="text-muted-foreground text-sm">Nenhum disparo criado ainda.</p>}
                {disparos.map((d) => (
                  <div key={d.id} className="flex items-center justify-between bg-card border border-border rounded-lg p-3">
                    <div>
                      <p className="font-semibold text-sm">{d.nome}</p>
                      <p className="text-xs text-muted-foreground">{d.cargo} · {d.recorrencia} · {d.horario} · <span className={d.ativo ? "text-green-400" : "text-red-400"}>{d.ativo ? "● ATIVO" : "● INATIVO"}</span></p>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <button onClick={() => dispararAgora(d)} className="text-xs px-2 py-1 rounded bg-accent/20 text-accent">▶ Disparar</button>
                      <button onClick={() => editarAgendado(d)} className="text-xs px-2 py-1 rounded bg-white/5">✏️</button>
                      <button onClick={() => excluirAgendado(d)} className="text-xs px-2 py-1 rounded bg-white/5 text-red-400">✕</button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-3 border-t border-white/10 pt-4">
                <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Novo / Editar Disparo</p>
                <input placeholder="Nome do disparo" value={ndNome} onChange={(e) => setNdNome(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg h-9 px-3 text-sm" />
                <div className="grid grid-cols-3 gap-2">
                  <select value={ndCargo} onChange={(e) => setNdCargo(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg h-9 px-2 text-sm">
                    <option value="vendedor">Vendedor</option>
                    <option value="gerente">Gerente</option>
                    <option value="gestor">Gestor</option>
                    <option value="todos">Todos</option>
                  </select>
                  <select value={ndRecorrencia} onChange={(e) => setNdRecorrencia(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg h-9 px-2 text-sm">
                    <option value="diario">Diário</option>
                    <option value="semanal">Semanal</option>
                    <option value="unico">Único</option>
                  </select>
                  <input type="time" value={ndHorario} onChange={(e) => setNdHorario(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg h-9 px-2 text-sm" />
                </div>
                <textarea value={ndTexto} onChange={(e) => setNdTexto(e.target.value)} placeholder="Mensagem" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm h-20" />
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={ndAtivo} onChange={(e) => setNdAtivo(e.target.checked)} /> Ativo
                </label>
                <button onClick={salvarAgendado} className="h-9 px-4 rounded-lg bg-accent text-white text-xs font-bold">💾 Salvar Disparo</button>
                {logAgendados && <pre className="text-xs whitespace-pre-wrap">{logAgendados}</pre>}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
