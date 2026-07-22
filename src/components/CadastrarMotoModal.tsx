"use client";

import { useState } from "react";
import { X, FileScan, Check } from "lucide-react";
import { chamarApi } from "@/lib/sessao";
import { SelectComOutro } from "@/components/SelectComOutro";

const LOJAS = ["Salinas","Atlântica","União Motos","Vision","Maré Motos","Muralha","Império","Confort","PQD Motos","Rio das Ostras","Infinity","Baby Motos","Em Transporte"];
const FORNECEDORES = ["ALEXANDRE&ALAN","CLEBER","MARCIO","GIRO","LOCAMERICA","FELIPPE","MARCUS","VICTOR","BOMCAR","FLUTUANTE"];
const MARCAS = ["YAMAHA","HONDA","SHINERAY"];

// Placa brasileira: formato antigo (ABC1234) ou Mercosul (ABC1D23).
function placaValida(placaBruta: string): boolean {
  const placa = (placaBruta || "").replace(/[\s-]/g, "").toUpperCase();
  if (!placa) return true; // campo vazio não bloqueia (nem toda moto tem placa ainda)
  return /^[A-Z]{3}\d{4}$/.test(placa) || /^[A-Z]{3}\d[A-Z]\d{2}$/.test(placa);
}

type DadosOcr = {
  chassi: string; placa: string; renavam: string; marca: string;
  modelo: string; ano: string; cor: string; valor: string; km: string;
};

type PossivelMesmaMoto = { tipo: string; linha: number; valor: string; marca: string; modelo: string; placaExistente: string };

export function CadastrarMotoModal({ onClose, onSalvo }: { onClose: () => void; onSalvo: () => void }) {
  const [etapa, setEtapa] = useState<"escolha" | "lendo" | "confirmar" | "completar">("escolha");
  const [dados, setDados] = useState<DadosOcr>({
    chassi: "", placa: "", renavam: "", marca: "", modelo: "", ano: "", cor: "", valor: "", km: "0",
  });
  const [chao, setChao] = useState("");
  const [fornecedor, setFornecedor] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState("");
  const [possivelMesmaMoto, setPossivelMesmaMoto] = useState<PossivelMesmaMoto | null>(null);

  const lerDocumento = (file: File) => {
    setEtapa("lendo");
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = (e.target?.result as string).split(",")[1];
      const data = await chamarApi({
        acao: "rh_ocr_documento",
        gerente: JSON.parse(localStorage.getItem("performace_sessao") || "{}").nome,
        arquivoBase64: base64,
        mimeType: file.type,
      });
      if (data && data.ok) {
        setDados(data.dados);
        setEtapa("confirmar");
      } else {
        setMsg("❌ " + ((data && data.erro) || "Não consegui ler o documento."));
        setEtapa("escolha");
      }
    };
    reader.readAsDataURL(file);
  };

  const salvar = async (forcarCadastro = false) => {
    setSalvando(true);
    setMsg("");
    const data = await chamarApi({
      acao: "rh_cadastrar_moto",
      gerente: JSON.parse(localStorage.getItem("performace_sessao") || "{}").nome,
      forcarCadastro,
      campos: {
        placa: dados.placa, chassi: dados.chassi, renavam: dados.renavam,
        marca: dados.marca, modelo: dados.modelo, ano: dados.ano, cor: dados.cor,
        km: dados.km, chao, fornecedor,
      },
    });
    if (data && data.ok) {
      setMsg("✅ Moto cadastrada!");
      setTimeout(() => { onSalvo(); onClose(); }, 800);
    } else if (data && data.possivelMesmaMoto) {
      // Achou uma moto já cadastrada com o mesmo chassi (ou últimos
      // dígitos) — provavelmente é a mesma que só ganhou placa agora.
      // Oferece atualizar em vez de travar/duplicar.
      setPossivelMesmaMoto(data.possivelMesmaMoto);
    } else {
      setMsg("❌ " + ((data && data.erro) || "Erro ao cadastrar."));
    }
    setSalvando(false);
  };

  const atualizarMotoExistente = async () => {
    if (!possivelMesmaMoto) return;
    setSalvando(true);
    setMsg("");
    const data = await chamarApi({
      acao: "rh_editar_moto",
      gerente: JSON.parse(localStorage.getItem("performace_sessao") || "{}").nome,
      linha: possivelMesmaMoto.linha,
      campos: {
        placa: dados.placa, chassi: dados.chassi, renavam: dados.renavam,
        marca: dados.marca, modelo: dados.modelo, ano: dados.ano, cor: dados.cor, km: dados.km,
      },
    });
    if (data && data.ok) {
      setMsg("✅ Moto atualizada (não criou duplicata)!");
      setTimeout(() => { onSalvo(); onClose(); }, 800);
    } else {
      setMsg("❌ " + ((data && data.erro) || "Erro ao atualizar."));
    }
    setSalvando(false);
  };

  if (possivelMesmaMoto) {
    return (
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 relative">
          <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
            <X size={20} />
          </button>
          <h2 className="text-xl font-black mb-3">⚠️ Moto <span className="text-accent">já cadastrada?</span></h2>
          <div className="bg-white/5 rounded-lg p-3 mb-3 text-sm space-y-1">
            <p><span className="text-muted-foreground">Achamos no sistema:</span> {possivelMesmaMoto.marca} {possivelMesmaMoto.modelo}</p>
            <p><span className="text-muted-foreground">Linha:</span> {possivelMesmaMoto.linha}</p>
            <p><span className="text-muted-foreground">Chassi cadastrado:</span> {possivelMesmaMoto.valor}</p>
            <p><span className="text-muted-foreground">Placa cadastrada:</span> {possivelMesmaMoto.placaExistente || "sem placa ainda"}</p>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Bate ({possivelMesmaMoto.tipo}) com o que você acabou de ler/digitar. Pode ser a mesma moto (cadastrada antes só com o chassi, agora emplacada).
          </p>
          {msg && <p className="text-sm mb-3">{msg}</p>}
          <div className="grid grid-cols-1 gap-2">
            <button onClick={atualizarMotoExistente} disabled={salvando}
              className="w-full h-11 rounded-lg bg-accent text-white font-bold text-sm disabled:opacity-60">
              {salvando ? "Atualizando..." : "✅ Atualizar essa moto (mesma moto)"}
            </button>
            <button onClick={() => salvar(true)} disabled={salvando}
              className="w-full h-11 rounded-lg bg-white/5 border border-white/10 text-sm font-semibold hover:border-accent disabled:opacity-60">
              {salvando ? "Cadastrando..." : "➕ Cadastrar como moto nova mesmo assim"}
            </button>
            <button onClick={() => setPossivelMesmaMoto(null)} className="text-xs text-muted-foreground hover:text-accent mt-1">
              ↩ Voltar e conferir os dados
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
          <X size={20} />
        </button>
        <h2 className="text-2xl font-black mb-4">CADASTRAR <span className="text-accent">VEÍCULO</span></h2>

        {etapa === "escolha" && (
          <div className="space-y-3">
            <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl py-8 cursor-pointer hover:border-accent transition-colors">
              <FileScan size={28} className="text-accent" />
              <span className="text-sm font-medium">📄 Documento (ATPV/CRLV/NF)</span>
              <span className="text-xs text-muted-foreground">Lê automaticamente por OCR</span>
              <input
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && lerDocumento(e.target.files[0])}
              />
            </label>
            <button
              onClick={() => setEtapa("completar")}
              className="w-full h-11 rounded-lg bg-white/5 border border-white/10 text-sm font-semibold hover:border-accent transition-colors"
            >
              ⌨️ Digitar manualmente
            </button>
            {msg && <p className="text-sm">{msg}</p>}
          </div>
        )}

        {etapa === "lendo" && (
          <div className="py-10 text-center">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Lendo o documento, aguarde...</p>
          </div>
        )}

        {(etapa === "confirmar" || etapa === "completar") && (
          <div className="space-y-3">
            {etapa === "confirmar" && (
              <div className="bg-accent/10 border border-accent/30 rounded-lg p-3 flex items-center gap-2 text-sm text-accent mb-2">
                <Check size={16} /> Dados extraídos — confira e complete abaixo
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Chassi</label>
                <input value={dados.chassi} onChange={(e) => setDados((d) => ({ ...d, chassi: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-lg h-9 px-2 text-sm mt-1" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Placa</label>
                <input value={dados.placa} onChange={(e) => setDados((d) => ({ ...d, placa: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-lg h-9 px-2 text-sm mt-1" />
                {dados.placa && !placaValida(dados.placa) && (
                  <p className="text-[11px] text-accent mt-1">✗ Formato de placa inválido (ex: ABC1234 ou ABC1D23)</p>
                )}
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Renavam</label>
                <input value={dados.renavam} onChange={(e) => setDados((d) => ({ ...d, renavam: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-lg h-9 px-2 text-sm mt-1" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Marca</label>
                <SelectComOutro value={dados.marca} onChange={(v) => setDados((d) => ({ ...d, marca: v }))}
                  opcoes={MARCAS} className="w-full bg-white/5 border border-white/10 rounded-lg h-9 px-2 text-sm mt-1" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Modelo</label>
                <input value={dados.modelo} onChange={(e) => setDados((d) => ({ ...d, modelo: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-lg h-9 px-2 text-sm mt-1" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Ano</label>
                <input value={dados.ano} onChange={(e) => setDados((d) => ({ ...d, ano: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-lg h-9 px-2 text-sm mt-1" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Cor</label>
                <input value={dados.cor} onChange={(e) => setDados((d) => ({ ...d, cor: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-lg h-9 px-2 text-sm mt-1" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">KM</label>
                <input value={dados.km} onChange={(e) => setDados((d) => ({ ...d, km: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-lg h-9 px-2 text-sm mt-1" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border mt-2">
              <div>
                <label className="text-xs font-semibold text-accent">Chão/Loja *</label>
                <SelectComOutro value={chao} onChange={setChao}
                  opcoes={LOJAS} className="w-full bg-white/5 border border-white/10 rounded-lg h-9 px-2 text-sm mt-1" />
              </div>
              <div>
                <label className="text-xs font-semibold text-accent">Fornecedor *</label>
                <SelectComOutro value={fornecedor} onChange={setFornecedor}
                  opcoes={FORNECEDORES} className="w-full bg-white/5 border border-white/10 rounded-lg h-9 px-2 text-sm mt-1" />
              </div>
            </div>

            {msg && <p className="text-sm">{msg}</p>}

            <button
              onClick={() => salvar()}
              disabled={salvando || !chao || !fornecedor || !placaValida(dados.placa)}
              className="w-full h-11 rounded-lg bg-accent text-white font-bold text-sm disabled:opacity-50 mt-2"
            >
              {salvando ? "Salvando..." : "💾 CADASTRAR MOTO"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
