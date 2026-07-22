"use client";

import { useState } from "react";
import { X, FileScan, Check } from "lucide-react";
import { chamarApi } from "@/lib/sessao";

type DadosOcr = {
  chassi: string; placa: string; renavam: string; marca: string;
  modelo: string; ano: string; cor: string; valor: string; km: string;
};
type MotoEncontrada = { linha: number; marca: string; modelo: string; valor: string; placaExistente: string; tipo: string };

export function AtualizarViaCrlvModal({ onClose, onSalvo }: { onClose: () => void; onSalvo: () => void }) {
  const [etapa, setEtapa] = useState<"escolha" | "lendo" | "buscando" | "confirmar" | "naoEncontrado">("escolha");
  const [dados, setDados] = useState<DadosOcr | null>(null);
  const [motoEncontrada, setMotoEncontrada] = useState<MotoEncontrada | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState("");

  const lerDocumento = (file: File) => {
    setEtapa("lendo");
    setMsg("");
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = (e.target?.result as string).split(",")[1];
      const dataOcr = await chamarApi({
        acao: "rh_ocr_documento",
        gerente: JSON.parse(localStorage.getItem("performace_sessao") || "{}").nome,
        arquivoBase64: base64,
        mimeType: file.type,
      });
      if (!dataOcr || !dataOcr.ok) {
        setMsg("❌ " + ((dataOcr && dataOcr.erro) || "Não consegui ler o documento."));
        setEtapa("escolha");
        return;
      }
      setDados(dataOcr.dados);
      setEtapa("buscando");
      // Sistema busca sozinho a moto que bate com o chassi lido — não é o
      // usuário que escolhe qual atualizar (pedido do Alan).
      const dataBusca = await chamarApi({ acao: "rh_buscar_moto_por_chassi", chassi: dataOcr.dados.chassi });
      if (dataBusca && dataBusca.ok && dataBusca.encontrado) {
        setMotoEncontrada(dataBusca.moto);
        setEtapa("confirmar");
      } else {
        setEtapa("naoEncontrado");
      }
    };
    reader.readAsDataURL(file);
  };

  const confirmarAtualizacao = async () => {
    if (!dados || !motoEncontrada) return;
    setSalvando(true);
    setMsg("");
    const campos: Record<string, string> = {};
    (Object.keys(dados) as (keyof DadosOcr)[]).forEach((k) => {
      if (k === "valor" || k === "km") return; // não mexe em custo/km por aqui
      if (dados[k]) campos[k] = dados[k];
    });
    const data = await chamarApi({
      acao: "rh_editar_moto",
      gerente: JSON.parse(localStorage.getItem("performace_sessao") || "{}").nome,
      linha: motoEncontrada.linha,
      campos,
    });
    if (data && data.ok) {
      setMsg("✅ Cadastro atualizado!");
      setTimeout(() => { onSalvo(); onClose(); }, 800);
    } else {
      setMsg("❌ " + ((data && data.erro) || "Erro ao atualizar."));
    }
    setSalvando(false);
  };

  const recomecar = () => {
    setDados(null);
    setMotoEncontrada(null);
    setMsg("");
    setEtapa("escolha");
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 relative max-h-[85vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
          <X size={20} />
        </button>
        <h2 className="text-xl font-black mb-1">Atualizar Cadastro <span className="text-accent">via CRLV</span></h2>
        <p className="text-xs text-muted-foreground mb-4">Sobe o documento — o sistema acha sozinho qual moto do estoque bate com o chassi.</p>

        {etapa === "escolha" && (
          <div>
            <label className="flex flex-col items-center justify-center gap-2 h-32 rounded-lg border-2 border-dashed border-white/10 cursor-pointer hover:border-accent transition-colors">
              <FileScan size={28} className="text-accent" />
              <span className="text-sm font-semibold">Subir CRLV, ATPV ou Nota Fiscal</span>
              <span className="text-[11px] text-muted-foreground">Foto ou PDF</span>
              <input type="file" accept="image/*,.pdf" className="hidden"
                onChange={(e) => e.target.files?.[0] && lerDocumento(e.target.files[0])} />
            </label>
            {msg && <p className="text-sm mt-3">{msg}</p>}
          </div>
        )}

        {etapa === "lendo" && (
          <div className="h-32 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">Lendo documento...</p>
          </div>
        )}

        {etapa === "buscando" && (
          <div className="h-32 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">Procurando moto compatível no estoque...</p>
          </div>
        )}

        {etapa === "naoEncontrado" && (
          <div className="text-center py-6 space-y-3">
            <p className="text-sm text-muted-foreground">⚠️ Não achei nenhuma moto no estoque com chassi compatível com esse documento.</p>
            <button onClick={recomecar} className="text-xs text-accent underline">↩ Tentar outro documento</button>
          </div>
        )}

        {etapa === "confirmar" && motoEncontrada && dados && (
          <div className="space-y-3">
            <div className="bg-white/5 rounded-lg p-3 text-sm space-y-1">
              <p className="text-xs text-muted-foreground mb-1">Achamos essa moto no sistema (bateu por {motoEncontrada.tipo}):</p>
              <p><span className="text-muted-foreground">Moto:</span> {motoEncontrada.marca} {motoEncontrada.modelo}</p>
              <p><span className="text-muted-foreground">Linha:</span> {motoEncontrada.linha}</p>
              <p><span className="text-muted-foreground">Placa cadastrada:</span> {motoEncontrada.placaExistente || "sem placa ainda"}</p>
              <p><span className="text-muted-foreground">Placa lida no documento:</span> {dados.placa || "—"}</p>
            </div>
            {msg && <p className="text-sm">{msg}</p>}
            <button onClick={confirmarAtualizacao} disabled={salvando}
              className="w-full h-11 rounded-lg bg-accent text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60">
              <Check size={15} /> {salvando ? "Salvando..." : "Sim, é essa — Atualizar"}
            </button>
            <button onClick={recomecar} className="w-full text-xs text-muted-foreground hover:text-accent">
              ↩ Não é essa / ler outro documento
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
