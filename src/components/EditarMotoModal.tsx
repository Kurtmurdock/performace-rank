"use client";

import { useState } from "react";
import { X, Lock, Unlock, Upload } from "lucide-react";
import { chamarApi, getSessao } from "@/lib/sessao";

type Moto = {
  linha: number;
  marca: string; modelo: string; versao?: string; ano?: string;
  placa: string; chassi: string; renavam?: string; cor: string; km?: string;
  chao: string; fornecedor: string; status: string;
  valorEntrada?: string; statusContrato?: string; caixaFinanceira?: string;
  statusPlaca?: string; gravame?: string; atpvE?: string; medalha?: string;
  manual?: string; ondeManual?: string; chaveReserva?: string; ondeChaveReserva?: string; ondePlaca?: string;
};

const LOJAS = ["Salinas","Atlântica","União Motos","Vision","Maré Motos","Muralha","Império","Confort","PQD Motos","Rio das Ostras","Infinity","Baby Motos"];
const FORNECEDORES = ["ALEXANDRE&ALAN","CLEBER","MARCIO","GIRO","LOCAMERICA","FELIPPE","MARCUS","VICTOR","BOMCAR","FLUTUANTE"];

function CampoTravavel({
  label, value, onChange,
}: { label: string; value: string; onChange: (v: string) => void }) {
  const [travado, setTravado] = useState(!!value);
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
        {label} {travado && <span className="text-accent normal-case">✓ já preenchido</span>}
      </label>
      <input
        type="text"
        value={value}
        disabled={travado}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white/5 border border-white/10 focus:border-accent rounded-lg h-9 px-3 text-sm outline-none mt-1 disabled:opacity-60"
      />
      {travado && (
        <button
          type="button"
          onClick={() => setTravado(false)}
          className="text-[11px] text-accent underline mt-1 flex items-center gap-1"
        >
          <Unlock size={10} /> destrancar e alterar
        </button>
      )}
    </div>
  );
}

export function EditarMotoModal({
  moto, onClose, onSalvo,
}: { moto: Moto; onClose: () => void; onSalvo: () => void }) {
  const [campos, setCampos] = useState({
    placa: moto.placa || "", chassi: moto.chassi || "", renavam: moto.renavam || "",
    marca: moto.marca || "", modelo: moto.modelo || "", versao: moto.versao || "",
    ano: moto.ano || "", cor: moto.cor || "", km: moto.km || "",
    chao: moto.chao || "", fornecedor: moto.fornecedor || "",
  });
  const [statusContrato, setStatusContrato] = useState(moto.statusContrato || "");
  const [caixaFinanceira, setCaixaFinanceira] = useState(moto.caixaFinanceira || "");
  const [statusPlaca, setStatusPlaca] = useState(moto.statusPlaca || "");
  const [gravame, setGravame] = useState(moto.gravame || "");
  const [atpvE, setAtpvE] = useState(moto.atpvE || "");
  const [medalha, setMedalha] = useState(moto.medalha === "Ouro" ? "Dourada" : moto.medalha || "Bronze");
  const [manual, setManual] = useState(moto.manual || "");
  const [ondeManual, setOndeManual] = useState(moto.ondeManual || "");
  const [chaveReserva, setChaveReserva] = useState(moto.chaveReserva || "");
  const [ondeChaveReserva, setOndeChaveReserva] = useState(moto.ondeChaveReserva || "");
  const [ondePlaca, setOndePlaca] = useState(moto.ondePlaca || "");
  const [valorEntrada, setValorEntrada] = useState(moto.valorEntrada || "");
  const [senhaMaster, setSenhaMaster] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [salvandoStatus, setSalvandoStatus] = useState(false);
  const [msgStatus, setMsgStatus] = useState("");
  const [msg, setMsg] = useState("");

  const sessao = getSessao();
  const ehGestor = sessao?.cargo === "gestor";

  // ── Status da Negociação — gatilho pra tela de Fechamento de Venda ──
  const statusAtual = moto.status.includes("Vendido") ? "vendido" : moto.status.includes("Negociação") ? "negociacao" : "disponivel";
  const [statusEscolhido, setStatusEscolhido] = useState<"disponivel" | "negociacao" | "vendido">(statusAtual);
  const [lojaStatus, setLojaStatus] = useState(moto.chao || "");

  // Selecionar "Vendido" (ou marcar o contrato como "Em Assinatura") leva
  // direto pra tela de Fechamento de Venda — cliente, autorizado, vendedor
  // e formas de pagamento não ficam mais aqui dentro do card (ficava
  // complicado de ler). Essa página nova cuida de tudo isso de uma vez.
  const irParaFechamento = () => {
    window.location.href = `/estoque/fechamento?linha=${moto.linha}`;
  };

  // Status da Negociação salva na hora, sem precisar do botão "Salvar"
  // geral (que só cuida do resto dos campos). Disponível salva assim que
  // escolhido; Em Negociação/Vendido salvam assim que a loja é escolhida.
  const salvarStatusRapido = async (statusEscolhidoAgora: "disponivel" | "negociacao" | "vendido", lojaEscolhidaAgora: string) => {
    if ((statusEscolhidoAgora === "negociacao" || statusEscolhidoAgora === "vendido") && !lojaEscolhidaAgora) return;
    let statusParaSalvar = "✅ Disponível";
    if (statusEscolhidoAgora === "negociacao") statusParaSalvar = `🔄 Em Negociação — ${lojaEscolhidaAgora}`;
    if (statusEscolhidoAgora === "vendido") statusParaSalvar = `🏁 Vendido, ${lojaEscolhidaAgora}`;

    setSalvandoStatus(true);
    setMsgStatus("");
    const data = await chamarApi({
      acao: "rh_editar_moto",
      gerente: JSON.parse(localStorage.getItem("performace_sessao") || "{}").nome,
      linha: moto.linha,
      novoStatus: statusParaSalvar,
    });
    if (data && data.ok) {
      setMsgStatus("✅ Status salvo!");
      onSalvo();
    } else {
      setMsgStatus("❌ " + ((data && data.erro) || "Erro ao salvar status."));
    }
    setSalvandoStatus(false);
  };

  const salvar = async () => {
    setSalvando(true);
    setMsg("");

    let novoStatus = "✅ Disponível";
    if (statusEscolhido === "negociacao") novoStatus = `🔄 Em Negociação — ${lojaStatus}`;
    if (statusEscolhido === "vendido") novoStatus = `🏁 Vendido, ${lojaStatus}`;

    if (statusEscolhido === "negociacao" && !lojaStatus) {
      setMsg("❌ Selecione a loja.");
      setSalvando(false);
      return;
    }

    const payload: any = {
      acao: "rh_editar_moto",
      gerente: JSON.parse(localStorage.getItem("performace_sessao") || "{}").nome,
      linha: moto.linha,
      campos: {
        ...campos,
        statusContrato, caixaFinanceira, statusPlaca, gravame, atpvE, medalha,
        temManual: manual, ondeManual, temChaveReserva: chaveReserva, ondeChaveReserva, ondePlaca,
      },
      // Só manda o custo se realmente mudou — senão toda vez que alguém
      // salva QUALQUER outra coisa no modal, isso ia disparar à toa a
      // exigência de senha master, mesmo sem mexer no valor.
      valorEntrada: valorEntrada !== (moto.valorEntrada || "") ? (valorEntrada || undefined) : undefined,
      senhaMaster: senhaMaster || undefined,
      novoStatus,
    };

    const data = await chamarApi(payload);
    if (data && data.ok) {
      setMsg("✅ Salvo com sucesso!");
      setTimeout(() => { onSalvo(); onClose(); }, 800);
    } else {
      setMsg("❌ " + ((data && data.erro) || "Erro ao salvar."));
    }
    setSalvando(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-card border border-border rounded-2xl max-w-4xl w-full my-8 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
          <X size={20} />
        </button>
        <div className="p-6 space-y-6">
          <div>
            <h2 className="text-2xl font-black">EDITAR <span className="text-accent">MOTO</span></h2>
            <p className="text-xs text-muted-foreground">Linha {moto.linha}</p>
          </div>

          {/* Status da Negociação */}
          <div className="bg-white/5 border border-border rounded-lg p-4">
            <label className="text-xs font-bold uppercase text-accent">Status da Negociação</label>
            <select
              value={statusEscolhido}
              onChange={(e) => {
                const v = e.target.value as "disponivel" | "negociacao" | "vendido";
                setStatusEscolhido(v);
                if (v === "disponivel") salvarStatusRapido(v, "");
              }}
              className="w-full bg-white/5 border border-white/10 rounded-lg h-10 px-3 text-sm mt-1"
            >
              <option value="disponivel">✅ Disponível</option>
              <option value="negociacao">🔄 Em Negociação</option>
              <option value="vendido">🏁 Vendido (entregue ao cliente)</option>
            </select>

            {(statusEscolhido === "negociacao" || statusEscolhido === "vendido") && (
              <div className="mt-3">
                <label className="text-xs text-muted-foreground">Chão</label>
                <select value={lojaStatus} onChange={(e) => {
                  const v = e.target.value;
                  setLojaStatus(v);
                  salvarStatusRapido(statusEscolhido, v);
                }}
                  className="w-full bg-white/5 border border-white/10 rounded-lg h-9 px-2 text-sm mt-1">
                  <option value="">—</option>
                  {LOJAS.map((l) => <option key={l}>{l}</option>)}
                </select>
              </div>
            )}

            {salvandoStatus && <p className="mt-2 text-[11px] text-muted-foreground">Salvando status...</p>}
            {msgStatus && !salvandoStatus && <p className="mt-2 text-[11px]">{msgStatus}</p>}

            {statusEscolhido === "vendido" && (
              <p className="mt-2 text-[11px] text-muted-foreground">
                Use isso só na hora da entrega física. O contrato (cliente/pagamento) é fechado separadamente.
              </p>
            )}

            <button type="button" onClick={irParaFechamento}
              className="mt-3 w-full h-9 rounded-lg bg-accent/20 border border-accent/40 text-accent text-xs font-semibold hover:bg-accent/30">
              📝 Ver / Editar Fechamento de Contrato
            </button>
          </div>

          {/* Status / Contrato */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold uppercase text-muted-foreground">Status do Contrato</label>
              <select value={statusContrato} onChange={(e) => {
                const v = e.target.value;
                setStatusContrato(v);
                if (v === "Em Assinatura") irParaFechamento();
              }}
                className="w-full bg-white/5 border border-white/10 rounded-lg h-9 px-2 text-sm mt-1">
                <option value="">—</option>
                <option>Em Assinatura</option>
                <option>Pago</option>
                <option>Pendente</option>
                <option>Cancelado</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-muted-foreground">Caixa Financeira (Banco)</label>
              <input value={caixaFinanceira} onChange={(e) => setCaixaFinanceira(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg h-9 px-2 text-sm mt-1" />
            </div>
          </div>

          {/* Campos travados */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <CampoTravavel label="Placa" value={campos.placa} onChange={(v) => setCampos((c) => ({ ...c, placa: v }))} />
            <CampoTravavel label="Chassi" value={campos.chassi} onChange={(v) => setCampos((c) => ({ ...c, chassi: v }))} />
            <CampoTravavel label="Renavam" value={campos.renavam} onChange={(v) => setCampos((c) => ({ ...c, renavam: v }))} />
            <CampoTravavel label="Marca" value={campos.marca} onChange={(v) => setCampos((c) => ({ ...c, marca: v }))} />
            <CampoTravavel label="Modelo" value={campos.modelo} onChange={(v) => setCampos((c) => ({ ...c, modelo: v }))} />
            <CampoTravavel label="Versão" value={campos.versao} onChange={(v) => setCampos((c) => ({ ...c, versao: v }))} />
            <CampoTravavel label="Ano" value={campos.ano} onChange={(v) => setCampos((c) => ({ ...c, ano: v }))} />
            <CampoTravavel label="Cor" value={campos.cor} onChange={(v) => setCampos((c) => ({ ...c, cor: v }))} />
            <CampoTravavel label="KM" value={campos.km} onChange={(v) => setCampos((c) => ({ ...c, km: v }))} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold uppercase text-muted-foreground">Chão/Loja (cadastro)</label>
              <select value={campos.chao} onChange={(e) => setCampos((c) => ({ ...c, chao: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-lg h-9 px-2 text-sm mt-1">
                <option value="">—</option>
                {[...LOJAS, "Em Transporte"].map((l) => <option key={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-muted-foreground">Fornecedor</label>
              <select value={campos.fornecedor} onChange={(e) => setCampos((c) => ({ ...c, fornecedor: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-lg h-9 px-2 text-sm mt-1">
                <option value="">—</option>
                {FORNECEDORES.map((f) => <option key={f}>{f}</option>)}
              </select>
            </div>
          </div>

          {/* Exigências */}
          <div>
            <p className="text-xs font-bold uppercase text-accent mb-2">Exigências</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Status da Placa</label>
                <select value={statusPlaca} onChange={(e) => setStatusPlaca(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg h-9 px-2 text-sm mt-1">
                  <option value="">—</option><option>Emplacada</option><option>Sem Placa</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Gravame</label>
                <select value={gravame} onChange={(e) => setGravame(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg h-9 px-2 text-sm mt-1">
                  <option value="">—</option><option>Ativo</option><option>Suspenso</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">ATPV-e</label>
                <select value={atpvE} onChange={(e) => setAtpvE(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg h-9 px-2 text-sm mt-1">
                  <option value="">—</option><option>Gerado</option><option>Pendente</option>
                </select>
              </div>
            </div>
          </div>

          {/* Medalha — só gestor pode alterar */}
          <div>
            <label className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1">
              Medalha
              {!ehGestor && (
                <span className="text-[10px] normal-case text-muted-foreground flex items-center gap-1">
                  <Lock size={9} /> apenas gestores podem alterar
                </span>
              )}
            </label>
            <select
              value={medalha}
              disabled={!ehGestor}
              onChange={(e) => setMedalha(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg h-9 px-2 text-sm mt-1 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <option>Bronze</option><option>Prata</option><option>Dourada</option>
            </select>
          </div>

          {/* Itens da moto */}
          <div>
            <p className="text-xs font-bold uppercase text-accent mb-2">Itens da Moto</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Manual</label>
                <select value={manual} onChange={(e) => setManual(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg h-9 px-2 text-sm mt-1">
                  <option value="">—</option><option>Sim</option><option>Não</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Onde está o manual?</label>
                <input value={ondeManual} onChange={(e) => setOndeManual(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg h-9 px-2 text-sm mt-1" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Chave Reserva</label>
                <select value={chaveReserva} onChange={(e) => setChaveReserva(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg h-9 px-2 text-sm mt-1">
                  <option value="">—</option><option>Sim</option><option>Não</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Onde está a chave reserva?</label>
                <input value={ondeChaveReserva} onChange={(e) => setOndeChaveReserva(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg h-9 px-2 text-sm mt-1" />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-muted-foreground">Onde está a placa?</label>
                <input value={ondePlaca} onChange={(e) => setOndePlaca(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg h-9 px-2 text-sm mt-1" />
              </div>
            </div>
          </div>

          {/* Valor de entrada (protegido) */}
          <div className="bg-accent/10 border border-accent/30 rounded-lg p-3">
            <label className="text-xs font-semibold uppercase text-accent flex items-center gap-1">
              <Lock size={11} /> Valor de Entrada / Custo (protegido por senha master — só gestor)
            </label>
            <div className="flex gap-2 mt-1">
              <input value={valorEntrada} onChange={(e) => setValorEntrada(e.target.value)} placeholder="R$ 0,00"
                className="flex-1 bg-white/5 border border-white/10 rounded-lg h-9 px-3 text-sm outline-none" />
              <input value={senhaMaster} onChange={(e) => setSenhaMaster(e.target.value)} type="password" placeholder="Senha master"
                autoComplete="new-password" name="performace-editarmoto-senha"
                className="w-40 bg-white/5 border border-white/10 rounded-lg h-9 px-3 text-sm outline-none" />
            </div>
          </div>

          {msg && <p className="text-sm">{msg}</p>}

          <button
            onClick={salvar}
            disabled={salvando}
            className="w-full h-11 rounded-lg bg-accent text-white font-bold text-sm disabled:opacity-60"
          >
            {salvando ? "Salvando..." : "💾 SALVAR ALTERAÇÕES"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function EnviarFotosModal({
  moto, onClose,
}: { moto: Moto; onClose: () => void }) {
  const [enviando, setEnviando] = useState(false);
  const [msg, setMsg] = useState("");

  const enviarArquivos = async (files: FileList | null) => {
    if (!files || !files.length) return;
    setEnviando(true);
    setMsg("");
    const arquivos = await Promise.all(
      Array.from(files).map(
        (f) =>
          new Promise<{ base64: string; mimeType: string }>((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) =>
              resolve({ base64: (e.target?.result as string).split(",")[1], mimeType: f.type });
            reader.readAsDataURL(f);
          })
      )
    );
    const data = await chamarApi({
      acao: "rh_upload_foto",
      quemEnviou: JSON.parse(localStorage.getItem("performace_sessao") || "{}").nome,
      linha: moto.linha,
      arquivos,
    });
    if (data && data.ok) setMsg(`✅ ${arquivos.length} foto(s) enviada(s)!`);
    else setMsg("❌ " + ((data && data.erro) || "Erro ao enviar."));
    setEnviando(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-card border border-border rounded-2xl max-w-sm w-full p-6 my-8 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
          <X size={20} />
        </button>
        <h2 className="text-xl font-black mb-1">ENVIAR <span className="text-accent">FOTOS</span></h2>
        <p className="text-xs text-muted-foreground mb-4">{moto.marca} {moto.modelo} — linha {moto.linha}</p>
        <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl py-8 cursor-pointer hover:border-accent transition-colors">
          <Upload size={24} className="text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Clique pra escolher as fotos</span>
          <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => enviarArquivos(e.target.files)} />
        </label>
        {enviando && <p className="text-sm mt-3">⏳ Enviando...</p>}
        {msg && <p className="text-sm mt-3">{msg}</p>}
      </div>
    </div>
  );
}
