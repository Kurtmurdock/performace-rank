"use client";

import { useEffect, useState } from "react";
import { X, Plus, Upload, FileText, Search } from "lucide-react";
import { chamarApi, getSessao } from "@/lib/sessao";

const CARGOS = ["vendedor", "gerente", "gestor"];
const LOJAS = ["Salinas","Atlântica","União Motos","Maré Motos","Muralha","PQD Motos","Rio das Ostras","Vision","Confort","Império","Infinity","Baby Motos"];

type Pessoa = { nome: string; telefone: string; cargo?: string; loja?: string };
type EventoEditavel = {
  id?: string; titulo?: string; tipo?: string; descricao?: string;
  dataISO?: string; horario?: string; recorrencia?: string;
};

export function EventoFormModal({
  evento, onClose, onSalvo,
}: { evento?: EventoEditavel; onClose: () => void; onSalvo: () => void }) {
  const sessao = getSessao();
  const editando = !!evento?.id;

  const [titulo, setTitulo] = useState(evento?.titulo || "");
  const [tipo, setTipo] = useState(evento?.tipo || "meeting");
  const [descricao, setDescricao] = useState(evento?.descricao || "");
  const [data, setData] = useState(evento?.dataISO || "");
  const [horario, setHorario] = useState(evento?.horario || "09:00");
  const [recorrencia, setRecorrencia] = useState(evento?.recorrencia || "unico");

  // Convidados — 3 formas de selecionar
  const [abaConvidados, setAbaConvidados] = useState<"individual" | "loja" | "cargo">("individual");
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [buscaPessoa, setBuscaPessoa] = useState("");
  const [individuaisSelecionados, setIndividuaisSelecionados] = useState<Pessoa[]>([]);
  const [lojasSelecionadas, setLojasSelecionadas] = useState<string[]>([]);
  const [cargosSelecionados, setCargosSelecionados] = useState<Record<string, boolean>>({});

  // Externos (telefone avulso, sem estar no RH)
  const [externoInput, setExternoInput] = useState("");
  const [externos, setExternos] = useState<string[]>([]);

  // Materiais
  const [materiais, setMateriais] = useState<{ nome: string; base64: string; mimeType: string }[]>([]);
  const [enviandoMaterial, setEnviandoMaterial] = useState(false);

  const [disparoAuto, setDisparoAuto] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (sessao?.cargo === "gestor") {
      chamarApi({ acao: "rh_listar", nomeQuemPede: sessao.nome }).then((data) => {
        if (data && data.ok) setPessoas(data.pessoas || []);
      });
    }
    if (editando && evento?.id) {
      chamarApi({ acao: "ev_obter_convidados", id: evento.id }).then((data) => {
        if (data && data.ok) {
          setIndividuaisSelecionados(data.individuais || []);
          setLojasSelecionadas(data.lojas || []);
          setCargosSelecionados(data.cargos || {});
          setExternos(data.externos || []);
        }
      });
    }
  }, []);

  const pessoasFiltradas = pessoas.filter((p) =>
    !buscaPessoa || p.nome.toLowerCase().includes(buscaPessoa.toLowerCase())
  );

  const toggleIndividual = (p: Pessoa) => {
    setIndividuaisSelecionados((lista) =>
      lista.some((x) => x.nome === p.nome) ? lista.filter((x) => x.nome !== p.nome) : [...lista, p]
    );
  };

  const adicionarExterno = () => {
    const tel = externoInput.replace(/\D/g, "");
    if (!tel || tel.length < 10) { setMsg("❌ Telefone inválido."); return; }
    if (externos.includes(tel)) { setExternoInput(""); return; }
    setExternos((e) => [...e, tel]);
    setExternoInput("");
    setMsg("");
  };

  const uploadMaterial = (e: React.ChangeEvent<HTMLInputElement>) => {
    const arquivos = Array.from(e.target.files || []);
    if (!arquivos.length) return;
    setEnviandoMaterial(true);
    Promise.all(
      arquivos.map(
        (f) =>
          new Promise<{ nome: string; base64: string; mimeType: string }>((resolve) => {
            const reader = new FileReader();
            reader.onload = (ev) =>
              resolve({
                nome: f.name,
                base64: (ev.target?.result as string).split(",")[1],
                mimeType: f.type,
              });
            reader.readAsDataURL(f);
          })
      )
    ).then((novos) => {
      setMateriais((m) => [...m, ...novos]);
      setEnviandoMaterial(false);
    });
    e.target.value = "";
  };

  const removerMaterial = (nome: string) => setMateriais((m) => m.filter((x) => x.nome !== nome));

  const salvar = async () => {
    if (!titulo || !data) { setMsg("❌ Preencha título e data."); return; }
    setSalvando(true);
    setMsg("");

    const cargosMap: Record<string, boolean> = {};
    Object.keys(cargosSelecionados).forEach((c) => { if (cargosSelecionados[c]) cargosMap[c] = true; });

    const payload = {
      acao: "ev_salvar",
      id: evento?.id,
      titulo, tipo, descricao, data, horario, recorrencia,
      convidados: individuaisSelecionados.map((p) => ({ nome: p.nome, telefone: p.telefone, tipo: "individual" })),
      lojas: lojasSelecionadas,
      cargos: cargosMap,
      externos,
      arquivos: materiais.map(({ base64, mimeType }) => ({ base64, mimeType })),
      disparoAuto,
      solicitante: sessao?.nome,
    };

    const data_ = await chamarApi(payload);
    if (data_ && data_.ok) { onSalvo(); onClose(); }
    else setMsg("❌ " + ((data_ && data_.erro) || "Erro ao salvar."));
    setSalvando(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-card border border-border rounded-2xl max-w-2xl w-full my-8 p-6 relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
          <X size={20} />
        </button>
        <h2 className="text-2xl font-black mb-4">
          {editando ? "EDITAR" : "CRIAR"} <span className="text-accent">EVENTO</span>
        </h2>

        <div className="space-y-4">
          <input placeholder="Título" value={titulo} onChange={(e) => setTitulo(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg h-10 px-3 text-sm" />

          <div className="grid grid-cols-2 gap-3">
            <select value={tipo} onChange={(e) => setTipo(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg h-10 px-3 text-sm">
              <option value="meeting">🎥 Meeting</option>
              <option value="presencial">📍 Presencial</option>
              <option value="outro">📋 Outro</option>
            </select>
            <select value={recorrencia} onChange={(e) => setRecorrencia(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg h-10 px-3 text-sm">
              <option value="unico">Único</option>
              <option value="semanal">Semanal</option>
              <option value="quinzenal">Quinzenal</option>
              <option value="mensal">Mensal</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <input type="date" value={data} onChange={(e) => setData(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg h-10 px-3 text-sm" />
            <input type="time" value={horario} onChange={(e) => setHorario(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg h-10 px-3 text-sm" />
          </div>

          <textarea placeholder="Pauta / descrição" value={descricao} onChange={(e) => setDescricao(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm h-20" />

          {/* ===== CONVIDADOS ===== */}
          <div className="border border-border rounded-lg p-3">
            <p className="text-xs font-bold text-accent mb-2">Convidados</p>
            <div className="flex gap-2 mb-3">
              {(["individual", "loja", "cargo"] as const).map((aba) => (
                <button key={aba} type="button" onClick={() => setAbaConvidados(aba)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize ${
                    abaConvidados === aba ? "bg-accent text-white" : "bg-white/5 text-muted-foreground"
                  }`}>
                  {aba === "individual" ? "Individual" : aba === "loja" ? "Por Loja" : "Por Cargo"}
                </button>
              ))}
            </div>

            {abaConvidados === "individual" && (
              <div>
                {sessao?.cargo !== "gestor" ? (
                  <p className="text-xs text-muted-foreground">Só gestores podem buscar pessoas individualmente.</p>
                ) : (
                  <>
                    <div className="relative mb-2">
                      <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input placeholder="Buscar pessoa..." value={buscaPessoa} onChange={(e) => setBuscaPessoa(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg h-9 pl-8 pr-3 text-sm" />
                    </div>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {pessoasFiltradas.map((p) => (
                        <label key={p.nome} className="flex items-center gap-2 text-sm px-2 py-1 rounded hover:bg-white/5">
                          <input type="checkbox"
                            checked={individuaisSelecionados.some((x) => x.nome === p.nome)}
                            onChange={() => toggleIndividual(p)} />
                          {p.nome} <span className="text-xs text-muted-foreground">({p.cargo})</span>
                        </label>
                      ))}
                    </div>
                    {individuaisSelecionados.length > 0 && (
                      <p className="text-[11px] text-muted-foreground mt-1">{individuaisSelecionados.length} selecionado(s)</p>
                    )}
                  </>
                )}
              </div>
            )}

            {abaConvidados === "loja" && (
              <div className="grid grid-cols-2 gap-1.5">
                {LOJAS.map((l) => (
                  <label key={l} className="flex items-center gap-1.5 text-xs">
                    <input type="checkbox" checked={lojasSelecionadas.includes(l)}
                      onChange={(e) =>
                        setLojasSelecionadas((ls) => e.target.checked ? [...ls, l] : ls.filter((x) => x !== l))
                      } />
                    {l}
                  </label>
                ))}
              </div>
            )}

            {abaConvidados === "cargo" && (
              <div className="flex gap-4">
                {CARGOS.map((c) => (
                  <label key={c} className="flex items-center gap-1.5 text-sm capitalize">
                    <input type="checkbox" checked={!!cargosSelecionados[c]}
                      onChange={(e) => setCargosSelecionados((cs) => ({ ...cs, [c]: e.target.checked }))} />
                    {c}s
                  </label>
                ))}
              </div>
            )}

            {/* Externos — sempre visível, independe da aba acima */}
            <div className="pt-3 mt-3 border-t border-white/10">
              <p className="text-xs font-semibold text-muted-foreground mb-1.5">Convidados externos (telefone)</p>
              <div className="flex gap-2">
                <input placeholder="(21) 90000-0000" value={externoInput}
                  onChange={(e) => setExternoInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), adicionarExterno())}
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg h-9 px-3 text-sm" />
                <button type="button" onClick={adicionarExterno}
                  className="h-9 px-3 rounded-lg bg-white/5 border border-white/10 text-sm hover:border-accent">
                  <Plus size={14} />
                </button>
              </div>
              {externos.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {externos.map((tel) => (
                    <span key={tel} className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-full px-2.5 py-1 text-xs">
                      {tel}
                      <button type="button" onClick={() => setExternos((e) => e.filter((t) => t !== tel))}>
                        <X size={11} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ===== MATERIAIS ===== */}
          <div className="border border-border rounded-lg p-3">
            <p className="text-xs font-bold text-accent mb-2">Materiais (opcional)</p>
            <label className="flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-lg py-4 cursor-pointer hover:border-accent transition-colors">
              <Upload size={16} className="text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {enviandoMaterial ? "Processando..." : "Clique pra anexar arquivos"}
              </span>
              <input type="file" multiple className="hidden" onChange={uploadMaterial} />
            </label>
            {materiais.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {materiais.map((m) => (
                  <span key={m.nome} className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-full px-2.5 py-1 text-xs">
                    <FileText size={11} /> {m.nome}
                    <button type="button" onClick={() => removerMaterial(m.nome)}>
                      <X size={11} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={disparoAuto} onChange={(e) => setDisparoAuto(e.target.checked)} />
            📡 Disparar convite automaticamente ao salvar
          </label>

          {msg && <p className="text-sm">{msg}</p>}
          <button onClick={salvar} disabled={salvando}
            className="w-full h-11 rounded-lg bg-accent text-white font-bold text-sm disabled:opacity-60">
            {salvando ? "Salvando..." : "💾 SALVAR EVENTO"}
          </button>
        </div>
      </div>
    </div>
  );
}
