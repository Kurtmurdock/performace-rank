"use client";

import { useState } from "react";
import { X, FileScan, Check, SkipForward } from "lucide-react";
import { chamarApi } from "@/lib/sessao";

type DadosOcr = {
  chassi: string; placa: string; renavam: string; marca: string;
  modelo: string; ano: string; cor: string; valor: string; km: string;
};
type MotoEncontrada = { linha: number; marca: string; modelo: string; valor: string; placaExistente: string; tipo: string };
type Resumo = { arquivo: string; resultado: "atualizado" | "sem_par" | "pulado" | "erro" };

export function AtualizarLoteCrlvModal({ onClose, onSalvo }: { onClose: () => void; onSalvo: () => void }) {
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [indiceAtual, setIndiceAtual] = useState(0);
  const [etapa, setEtapa] = useState<"escolha" | "processando" | "confirmar" | "resumo">("escolha");
  const [dadosAtual, setDadosAtual] = useState<DadosOcr | null>(null);
  const [motoAtual, setMotoAtual] = useState<MotoEncontrada | null>(null);
  const [resumo, setResumo] = useState<Resumo[]>([]);
  const [msg, setMsg] = useState("");

  const iniciar = (files: FileList) => {
    const lista = Array.from(files);
    setArquivos(lista);
    setIndiceAtual(0);
    setResumo([]);
    processarArquivo(lista, 0, []);
  };

  const processarArquivo = async (lista: File[], indice: number, resumoAteAgora: Resumo[]) => {
    if (indice >= lista.length) {
      setResumo(resumoAteAgora);
      setEtapa("resumo");
      onSalvo();
      return;
    }
    setIndiceAtual(indice);
    setEtapa("processando");
    const file = lista[indice];
    const base64 = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve((e.target?.result as string).split(",")[1]);
      reader.readAsDataURL(file);
    });
    const dataOcr = await chamarApi({
      acao: "rh_ocr_documento",
      gerente: JSON.parse(localStorage.getItem("performace_sessao") || "{}").nome,
      arquivoBase64: base64,
      mimeType: file.type,
    });
    if (!dataOcr || !dataOcr.ok) {
      processarArquivo(lista, indice + 1, [...resumoAteAgora, { arquivo: file.name, resultado: "erro" }]);
      return;
    }
    const dataBusca = await chamarApi({ acao: "rh_buscar_moto_por_chassi", chassi: dataOcr.dados.chassi });
    if (dataBusca && dataBusca.ok && dataBusca.encontrado) {
      setDadosAtual(dataOcr.dados);
      setMotoAtual(dataBusca.moto);
      setResumoParcial(resumoAteAgora);
      setEtapa("confirmar");
    } else {
      processarArquivo(lista, indice + 1, [...resumoAteAgora, { arquivo: file.name, resultado: "sem_par" }]);
    }
  };

  // Guarda o resumo acumulado enquanto espera a confirmação do usuário
  // pro documento atual (não dá pra usar closure direto por causa da
  // pausa assíncrona esperando o clique).
  const [resumoParcialState, setResumoParcial] = useState<Resumo[]>([]);

  const confirmarAtual = async () => {
    if (!dadosAtual || !motoAtual) return;
    setMsg("");
    const campos: Record<string, string> = {};
    (Object.keys(dadosAtual) as (keyof DadosOcr)[]).forEach((k) => {
      if (k === "valor" || k === "km") return;
      if (dadosAtual[k]) campos[k] = dadosAtual[k];
    });
    const data = await chamarApi({
      acao: "rh_editar_moto",
      gerente: JSON.parse(localStorage.getItem("performace_sessao") || "{}").nome,
      linha: motoAtual.linha,
      campos,
    });
    const arquivoAtual = arquivos[indiceAtual];
    const novoResumo: Resumo[] = [...resumoParcialState, { arquivo: arquivoAtual.name, resultado: data && data.ok ? "atualizado" : "erro" }];
    processarArquivo(arquivos, indiceAtual + 1, novoResumo);
  };

  const pularAtual = () => {
    const arquivoAtual = arquivos[indiceAtual];
    processarArquivo(arquivos, indiceAtual + 1, [...resumoParcialState, { arquivo: arquivoAtual.name, resultado: "pulado" }]);
  };

  const rotuloResultado = (r: Resumo["resultado"]) => {
    if (r === "atualizado") return "✅ Atualizado";
    if (r === "sem_par") return "⚠️ Nenhuma moto compatível";
    if (r === "pulado") return "↩ Pulado";
    return "❌ Erro";
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 relative max-h-[85vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
          <X size={20} />
        </button>
        <h2 className="text-xl font-black mb-1">Atualizar em <span className="text-accent">Lote via CRLV</span></h2>
        <p className="text-xs text-muted-foreground mb-4">Sobe vários documentos de uma vez — cada um pede sua confirmação antes de atualizar.</p>

        {etapa === "escolha" && (
          <label className="flex flex-col items-center justify-center gap-2 h-32 rounded-lg border-2 border-dashed border-white/10 cursor-pointer hover:border-accent transition-colors">
            <FileScan size={28} className="text-accent" />
            <span className="text-sm font-semibold">Subir vários CRLVs/ATPVs/Notas</span>
            <span className="text-[11px] text-muted-foreground">Fotos ou PDFs — pode selecionar vários</span>
            <input type="file" accept="image/*,.pdf" multiple className="hidden"
              onChange={(e) => e.target.files && e.target.files.length && iniciar(e.target.files)} />
          </label>
        )}

        {etapa === "processando" && (
          <div className="h-32 flex flex-col items-center justify-center gap-1">
            <p className="text-sm text-muted-foreground">Lendo documento {indiceAtual + 1} de {arquivos.length}...</p>
          </div>
        )}

        {etapa === "confirmar" && motoAtual && dadosAtual && (
          <div className="space-y-3">
            <p className="text-[11px] text-muted-foreground">Documento {indiceAtual + 1} de {arquivos.length}: {arquivos[indiceAtual]?.name}</p>
            <div className="bg-white/5 rounded-lg p-3 text-sm space-y-1">
              <p className="text-xs text-muted-foreground mb-1">Achamos essa moto (bateu por {motoAtual.tipo}):</p>
              <p><span className="text-muted-foreground">Moto:</span> {motoAtual.marca} {motoAtual.modelo}</p>
              <p><span className="text-muted-foreground">Linha:</span> {motoAtual.linha}</p>
              <p><span className="text-muted-foreground">Placa cadastrada:</span> {motoAtual.placaExistente || "sem placa ainda"}</p>
              <p><span className="text-muted-foreground">Placa lida:</span> {dadosAtual.placa || "—"}</p>
            </div>
            {msg && <p className="text-sm">{msg}</p>}
            <div className="grid grid-cols-2 gap-2">
              <button onClick={confirmarAtual}
                className="h-11 rounded-lg bg-accent text-white font-bold text-sm flex items-center justify-center gap-2">
                <Check size={15} /> É essa
              </button>
              <button onClick={pularAtual}
                className="h-11 rounded-lg bg-white/5 border border-white/10 text-sm font-semibold flex items-center justify-center gap-2 hover:border-accent">
                <SkipForward size={15} /> Pular
              </button>
            </div>
          </div>
        )}

        {etapa === "resumo" && (
          <div className="space-y-2">
            <p className="text-sm font-semibold mb-2">
              ✅ {resumo.filter((r) => r.resultado === "atualizado").length} atualizado(s) ·
              ⚠️ {resumo.filter((r) => r.resultado === "sem_par").length} sem par ·
              ↩ {resumo.filter((r) => r.resultado === "pulado").length} pulado(s)
            </p>
            <div className="max-h-56 overflow-y-auto space-y-1">
              {resumo.map((r, i) => (
                <div key={i} className="flex items-center justify-between text-xs bg-white/5 rounded-lg px-2 py-1.5">
                  <span className="truncate">{r.arquivo}</span>
                  <span className="shrink-0 ml-2">{rotuloResultado(r.resultado)}</span>
                </div>
              ))}
            </div>
            <button onClick={onClose} className="w-full h-10 rounded-lg bg-accent text-white font-bold text-sm mt-2">Fechar</button>
          </div>
        )}
      </div>
    </div>
  );
}
