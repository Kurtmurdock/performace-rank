"use client";

import { useEffect, useState, useMemo } from "react";
import { Sidebar, TopBar, BellButton } from "@/components/Sidebar";
import { GlowCard } from "@/components/ui/spotlight-card";
import { FiltroDropdown } from "@/components/FiltroDropdown";
import { chamarApi, getSessao } from "@/lib/sessao";
import { Search, Pencil, Camera, X, ArrowLeft, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { EditarMotoModal, EnviarFotosModal } from "@/components/EditarMotoModal";
import { CadastrarMotoModal } from "@/components/CadastrarMotoModal";

type Moto = {
  linha: number; marca: string; modelo: string; ano?: string; chassi: string;
  placa: string; renavam?: string; cor: string; km?: string;
  chao: string; fornecedor: string; status: string;
  valorEntrada?: string; statusContrato?: string; caixaFinanceira?: string; medalha?: string;
  dataEntrada?: string; statusPlaca?: string; gravame?: string; atpvE?: string;
  vendedorResponsavel?: string; temManual?: string; ondeManual?: string;
  temChaveReserva?: string; ondeChaveReserva?: string; ondePlaca?: string;
  fotos?: string[]; dataVenda?: string;
};

type ItemTabela = { chave: string; preco: number };

const LOJAS = ["Salinas","Atlântica","União Motos","Vision","Maré Motos","Muralha","Império","Confort","PQD Motos","Rio das Ostras","Infinity","Baby Motos","Em Transporte"];
const FORNECEDORES = ["ALEXANDRE&ALAN","CLEBER","MARCIO","GIRO","LOCAMERICA","FELIPPE","MARCUS","VICTOR","BOMCAR","FLUTUANTE"];
const MARCAS = ["YAMAHA","HONDA","SHINERAY"];
const BANCOS = ["A VISTA","BRADESCO LOC","BV AUTOMODELO","BV BOMCAR","BV CLEBER","BV CONFORT","BV LELE","BV SALINAS","BV VISION","PAN AUTOMODELO","PAN CFT","PAN UNIÃO","PAN VISION","SANT ATLÂNTICA","SANT LELE","SANT SALINAS","SANT UNIÃO"];
const MEDALHAS = ["BRONZE","PRATA","DOURADA"];

function diasDesde(dataStr?: string) {
  if (!dataStr) return null;
  const m = dataStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) return null;
  const dataCad = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  const diff = Math.floor((Date.now() - dataCad.getTime()) / 86400000);
  return diff >= 0 ? diff : null;
}

function lojaAcao(m: Moto) {
  const s = m.status || "";
  const mn = s.match(/Negociação.{1,3}(.+)/);
  if (mn) return mn[1].trim();
  const mv = s.match(/Vendido,(.+)/);
  if (mv) return mv[1].trim();
  return m.chao || "";
}

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function corDoStatus(status: string) {
  if (status.includes("Vendido")) return "red" as const;
  if (status.includes("Negociação")) return "orange" as const;
  return "green" as const;
}

function CarrosselFotos({ fotos }: { fotos: string[] }) {
  const [idx, setIdx] = useState(0);
  if (!fotos.length) return null;
  return (
    <div className="relative -mx-4 -mt-4 mb-3 h-40 overflow-hidden rounded-t-2xl bg-black/40">
      <img src={fotos[idx]} alt="Foto da moto" loading="lazy" className="w-full h-full object-cover" />
      {fotos.length > 1 && (
        <>
          <button onClick={() => setIdx((i) => (i - 1 + fotos.length) % fotos.length)}
            className="absolute left-1 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center"><ChevronLeft size={14} /></button>
          <button onClick={() => setIdx((i) => (i + 1) % fotos.length)}
            className="absolute right-1 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center"><ChevronRight size={14} /></button>
          <span className="absolute bottom-1 right-2 text-[10px] bg-black/60 px-1.5 py-0.5 rounded">{idx + 1}/{fotos.length}</span>
        </>
      )}
    </div>
  );
}

export default function EstoquePage() {
  const [motos, setMotos] = useState<Moto[]>([]);
  const [tabelaPrecos, setTabelaPrecos] = useState<ItemTabela[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");
  const [motoEditando, setMotoEditando] = useState<Moto | null>(null);
  const [motoFotos, setMotoFotos] = useState<Moto | null>(null);
  const [cadastrando, setCadastrando] = useState(false);
  const sessao = getSessao();
  const podeEditar = sessao?.cargo === "gestor" || sessao?.cargo === "gerente";

  const [fStatus, setFStatus] = useState<string[]>([]);
  const [fPlaca, setFPlaca] = useState<string[]>([]);
  const [fChao, setFChao] = useState<string[]>([]);
  const [fFornecedor, setFFornecedor] = useState<string[]>([]);
  const [fMarca, setFMarca] = useState<string[]>([]);
  const [fValor, setFValor] = useState<string[]>([]);
  const [fContrato, setFContrato] = useState<string[]>([]);
  const [fBanco, setFBanco] = useState<string[]>([]);
  const [fMedalha, setFMedalha] = useState<string[]>([]);

  const carregar = () => {
    chamarApi({ acao: "rh_listar_estoque_mobile" }).then((data) => {
      if (data && data.ok) setMotos(data.motos || []);
      setCarregando(false);
    });
    chamarApi({ acao: "rh_obter_tabela_precos" }).then((data) => {
      if (data && data.ok) setTabelaPrecos(data.tabela || []);
    });
  };
  useEffect(() => { carregar(); }, []);

  const buscarPrecoPadrao = (marca: string, modelo: string): number | null => {
    if (!tabelaPrecos.length) return null;
    const texto = `${marca || ""} ${modelo || ""}`.toUpperCase();
    for (const item of tabelaPrecos) {
      const chave = (item.chave || "").toUpperCase().trim();
      if (chave && texto.indexOf(chave) > -1) return item.preco;
    }
    return null;
  };

  const limparFiltros = () => {
    setFStatus([]); setFPlaca([]); setFChao([]); setFFornecedor([]);
    setFMarca([]); setFValor([]); setFContrato([]); setFBanco([]); setFMedalha([]);
  };
  const totalFiltrosAtivos =
    fStatus.length + fPlaca.length + fChao.length + fFornecedor.length +
    fMarca.length + fValor.length + fContrato.length + fBanco.length + fMedalha.length;

  const filtradas = useMemo(() => {
    return motos.filter((m) => {
      const texto = `${m.marca} ${m.modelo} ${m.placa} ${m.chassi} ${m.cor}`.toLowerCase();
      if (busca && !texto.includes(busca.toLowerCase())) return false;
      if (fStatus.length) {
        const s = m.status.includes("Vendido") ? "VENDIDO" : m.status.includes("Negociação") ? "NEGOCIAÇÃO" : "DISPONÍVEL";
        if (!fStatus.includes(s)) return false;
      }
      if (fPlaca.length) {
        const rotulo = m.placa && m.placa.toUpperCase() !== "SEM PLACA" ? "EMPLACADA" : "SEM PLACA";
        if (!fPlaca.includes(rotulo)) return false;
      }
      if (fChao.length && !fChao.some((l) => l.toUpperCase() === (m.chao || "").toUpperCase())) return false;
      if (fFornecedor.length && !fFornecedor.includes((m.fornecedor || "").toUpperCase())) return false;
      if (fMarca.length && !fMarca.includes((m.marca || "").toUpperCase())) return false;
      if (fValor.length) {
        const rotulo = buscarPrecoPadrao(m.marca, m.modelo) !== null ? "COM VALOR" : "SEM VALOR";
        if (!fValor.includes(rotulo)) return false;
      }
      if (fContrato.length && !fContrato.includes((m.statusContrato || "").toUpperCase())) return false;
      if (fBanco.length && !fBanco.includes((m.caixaFinanceira || "").toUpperCase())) return false;
      if (fMedalha.length && !fMedalha.includes((m.medalha || "").toUpperCase())) return false;
      return true;
    });
  }, [motos, busca, fStatus, fPlaca, fChao, fFornecedor, fMarca, fValor, fContrato, fBanco, fMedalha, tabelaPrecos]);

  const disp = filtradas.filter((m) => !m.status.includes("Vendido") && !m.status.includes("Negociação"));
  const neg = filtradas.filter((m) => m.status.includes("Negociação"));
  const vnd = filtradas.filter((m) => m.status.includes("Vendido"));

  const CardMoto = ({ moto }: { moto: Moto }) => {
    const precoPadrao = buscarPrecoPadrao(moto.marca, moto.modelo);
    const loja = lojaAcao(moto);
    const chaoFisico = moto.chao || "";
    const emAcao = moto.status.includes("Negociação") || moto.status.includes("Vendido");
    const badge = moto.status.includes("Negociação")
      ? `🔄 EM NEGOCIAÇÃO — ${loja.toUpperCase()}`
      : moto.status.includes("Vendido")
      ? `🏁 VENDIDA — ${loja.toUpperCase()}`
      : "✅ DISPONÍVEL";

    return (
      <GlowCard glowColor={corDoStatus(moto.status)} className="p-4 h-full flex flex-col">
        {moto.fotos && moto.fotos.length > 0 && <CarrosselFotos fotos={moto.fotos} />}

        <div className="flex items-center justify-between mb-1">
          <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${
            moto.status.includes("Vendido") ? "bg-red-500/20 text-red-400"
            : moto.status.includes("Negociação") ? "bg-orange-500/20 text-orange-400"
            : "bg-green-500/20 text-green-400"}`}>
            {badge}
          </span>
          <span title={`Medalha: ${moto.medalha}`}>
            {moto.medalha === "Dourada" ? "🥇" : moto.medalha === "Prata" ? "🥈" : "🥉"}
          </span>
        </div>

        <p className="text-[10px] text-muted-foreground font-mono mb-1">CÓD: {moto.linha}</p>
        <p className="text-xs text-muted-foreground uppercase">{moto.marca}</p>
        <p className="font-bold text-lg leading-tight">{moto.modelo}</p>
        <p className="text-xs text-muted-foreground mb-2">{moto.ano}{moto.cor ? ` · ${moto.cor}` : ""}</p>

        <div className="bg-white/5 rounded-lg px-3 py-1.5 font-mono text-sm font-bold mb-2">
          {moto.placa || "Sem placa"}
        </div>

        <div className="space-y-1 text-xs mb-2">
          {moto.statusContrato && <p className="bg-purple-500/10 text-purple-300 rounded px-2 py-1">📝 Contrato: {moto.statusContrato}</p>}
          {moto.caixaFinanceira && <p className="bg-purple-500/10 text-purple-300 rounded px-2 py-1">🏦 {moto.caixaFinanceira}</p>}
          {moto.statusPlaca && <p className="bg-purple-500/10 text-purple-300 rounded px-2 py-1">🪪 {moto.statusPlaca}</p>}
          {moto.gravame && <p className="bg-purple-500/10 text-purple-300 rounded px-2 py-1">🔒 Gravame: {moto.gravame}</p>}
          {moto.atpvE && <p className="bg-purple-500/10 text-purple-300 rounded px-2 py-1">📑 ATPV-E: {moto.atpvE}</p>}
        </div>

        <div className="space-y-0.5 text-xs text-muted-foreground mb-2">
          {moto.temManual && <p>📘 Manual: {moto.temManual}{moto.temManual === "Possui" && moto.ondeManual ? ` — ${moto.ondeManual}` : ""}</p>}
          {moto.temChaveReserva && <p>🔑 Chave Reserva: {moto.temChaveReserva}{moto.temChaveReserva === "Possui" && moto.ondeChaveReserva ? ` — ${moto.ondeChaveReserva}` : ""}</p>}
          {moto.ondePlaca && <p>📍 Placa em: {moto.ondePlaca}</p>}
        </div>

        {moto.dataEntrada && (
          <p className="text-xs mb-2">
            <span className="text-yellow-600">📅 Cadastro: {moto.dataEntrada}</span>
            {diasDesde(moto.dataEntrada) !== null && (
              <span className="text-muted-foreground"> · {diasDesde(moto.dataEntrada)} dias</span>
            )}
          </p>
        )}

        <hr className="border-border my-2" />
        <div className="space-y-0.5 text-xs text-muted-foreground mb-2">
          {moto.km !== "" && moto.km !== undefined && <p>🛣 {moto.km} km</p>}
          {moto.chassi && <p>🔩 {moto.chassi}</p>}
          {moto.renavam && <p>📄 {moto.renavam}</p>}
          {moto.chao && <p>🏪 {moto.chao}</p>}
          {moto.fornecedor && <p>🏭 {moto.fornecedor}</p>}
        </div>

        {precoPadrao !== null ? (
          <p className="text-green-400 font-bold text-lg mb-1">💰 {formatBRL(precoPadrao)}</p>
        ) : (
          <p className="text-orange-400 text-xs font-semibold mb-1">📄 Subir Nota ou CRLV</p>
        )}

        {loja && emAcao && (
          <p className="text-xs text-yellow-600 mb-2">
            📍 {loja}
            {chaoFisico && chaoFisico !== loja && <span className="opacity-50 text-[10px]"> · chão: {chaoFisico}</span>}
          </p>
        )}

        <div className="flex flex-col gap-2 mt-auto">
          <button onClick={() => setMotoFotos(moto)}
            className="w-full h-9 rounded-lg bg-white/5 border border-white/10 text-xs font-semibold flex items-center justify-center gap-1.5 hover:border-accent transition-colors">
            <Camera size={13} /> {moto.fotos && moto.fotos.length ? "Adicionar Fotos" : "Enviar Fotos"}
          </button>
          {podeEditar && (
            <button onClick={() => setMotoEditando(moto)}
              className="w-full h-9 rounded-lg bg-accent/20 border border-accent/40 text-accent text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-accent/30 transition-colors">
              <Pencil size={13} /> Editar
            </button>
          )}
        </div>
      </GlowCard>
    );
  };

  const Secao = ({ titulo, lista, cor }: { titulo: string; lista: Moto[]; cor: string }) => {
    if (!lista.length) return null;
    return (
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-px flex-1 bg-border" />
          <p className="text-xs uppercase tracking-widest font-bold" style={{ color: cor }}>{titulo}</p>
          <span className="text-xs bg-card border border-border rounded-full px-2 py-0.5">{lista.length}</span>
          <div className="h-px flex-1 bg-border" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {lista.map((moto) => <div key={moto.linha} className="fade-slide-up"><CardMoto moto={moto} /></div>)}
        </div>
      </div>
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
            {podeEditar && (
              <button onClick={() => setCadastrando(true)}
                className="h-10 px-4 rounded-lg bg-accent text-white font-bold text-sm flex items-center gap-2 shrink-0 hover:opacity-90 transition-opacity">
                <Plus size={15} /> Cadastrar Novo Veículo
              </button>
            )}
          </div>

          <h1 className="text-3xl md:text-4xl font-black mb-4">Estoque</h1>

          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-card border border-border rounded-lg py-3 text-center">
              <p className="text-2xl font-black text-green-400">{motos.filter((m) => !m.status.includes("Vendido") && !m.status.includes("Negociação")).length}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Disponíveis</p>
            </div>
            <div className="bg-card border border-border rounded-lg py-3 text-center">
              <p className="text-2xl font-black text-orange-400">{motos.filter((m) => m.status.includes("Negociação")).length}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Negociação</p>
            </div>
            <div className="bg-card border border-border rounded-lg py-3 text-center">
              <p className="text-2xl font-black text-accent">{motos.filter((m) => m.status.includes("Vendido")).length}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Vendidas</p>
            </div>
          </div>

          <div className="relative mb-3">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="text" placeholder="Buscar por modelo, marca, placa, cor..." value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full bg-card border border-border rounded-lg h-10 pl-9 pr-3 text-sm outline-none focus:border-accent" />
          </div>

          <div className="flex flex-wrap gap-2 mb-2">
            <FiltroDropdown label="Status" opcoes={["DISPONÍVEL","NEGOCIAÇÃO","VENDIDO"]} selecionados={fStatus} onChange={setFStatus} />
            <FiltroDropdown label="Placa" opcoes={["EMPLACADA","SEM PLACA"]} selecionados={fPlaca} onChange={setFPlaca} />
            <FiltroDropdown label="Chão" opcoes={LOJAS.map((l) => l.toUpperCase())} selecionados={fChao} onChange={setFChao} />
            <FiltroDropdown label="Fornecedor" opcoes={FORNECEDORES} selecionados={fFornecedor} onChange={setFFornecedor} />
            <FiltroDropdown label="Marca" opcoes={MARCAS} selecionados={fMarca} onChange={setFMarca} />
            <FiltroDropdown label="Valor" opcoes={["SEM VALOR","COM VALOR"]} selecionados={fValor} onChange={setFValor} />
            <FiltroDropdown label="Contrato" opcoes={["EM ASSINATURA","ASSINADO","PAGO"]} selecionados={fContrato} onChange={setFContrato} />
            <FiltroDropdown label="Banco" opcoes={BANCOS} selecionados={fBanco} onChange={setFBanco} />
            <FiltroDropdown label="Medalha" opcoes={MEDALHAS} selecionados={fMedalha} onChange={setFMedalha} />
          </div>

          {totalFiltrosAtivos > 0 && (
            <button onClick={limparFiltros} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-accent mb-4">
              <X size={12} /> limpar filtros ({totalFiltrosAtivos})
            </button>
          )}

          {carregando && <p className="text-muted-foreground mt-4">Carregando...</p>}

          <div className="mt-4">
            <Secao titulo="✅ Disponíveis" lista={disp} cor="#4ade80" />
            <Secao titulo="🔄 Em Negociação" lista={neg} cor="#fb923c" />
            <Secao titulo="🏁 Vendidas" lista={vnd} cor="#dc2626" />
          </div>

          {!carregando && filtradas.length === 0 && (
            <p className="text-muted-foreground text-center py-10">Nenhuma moto encontrada.</p>
          )}
        </div>
      </div>

      {motoEditando && <EditarMotoModal moto={motoEditando} onClose={() => setMotoEditando(null)} onSalvo={carregar} />}
      {motoFotos && <EnviarFotosModal moto={motoFotos} onClose={() => setMotoFotos(null)} />}
      {cadastrando && <CadastrarMotoModal onClose={() => setCadastrando(false)} onSalvo={carregar} />}
    </main>
  );
}
