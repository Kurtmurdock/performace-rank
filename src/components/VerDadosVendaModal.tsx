"use client";

import { useEffect, useState } from "react";
import { X, Eye, Upload, FileText, Video, Lock, AlertTriangle } from "lucide-react";
import { chamarApi, getSessao } from "@/lib/sessao";
import type { Cliente } from "@/components/ClienteBusca";
import type { FormaPagamento } from "@/components/FormasPagamentoEditor";

type DadosVenda = {
  ok: boolean;
  travado?: boolean;
  cliente?: Cliente | null;
  autorizado?: Cliente | null;
  formasPagamento?: FormaPagamento[];
  sdrNome?: string;
  halfVendedorNome?: string;
  vendedorNome?: string;
  lojaVenda?: string;
  contratoAssinadoUrl?: string;
  videoDeclaratorioUrl?: string;
  erro?: string;
};

function brl(v: string | number | undefined) {
  const n = parseFloat((v ?? "0").toString().replace(/[R$\s.]/g, "").replace(",", "."));
  return isNaN(n) ? "R$ 0,00" : n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function arquivoParaBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = (e.target?.result as string).split(",")[1];
      resolve({ base64, mimeType: file.type });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function Linha({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-3 text-sm py-1 border-b border-white/5 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold text-right">{value}</span>
    </div>
  );
}

function descricaoForma(f: FormaPagamento): string {
  if (f.tipo === "entrada") return `Entrada (${f.meio || "-"}): ${brl(f.valor)}`;
  if (f.tipo === "financiamento") return `Financiamento ${f.banco || "-"} (${f.prestacoes || "?"}x): ${brl(f.valor)}`;
  if (f.tipo === "boleto") return `Boleto — venc. ${f.vencimento || "-"} (${f.recorrencias || "1"}x): ${brl(f.valor)}`;
  if (f.tipo === "veiculo") return `Troca: ${f.marca || ""} ${f.modelo || ""} (${f.placa || "sem placa"}): ${brl(f.valor)}`;
  return "";
}

export function VerDadosVendaModal({ linha, onClose }: { linha: number; onClose: () => void }) {
  const [dados, setDados] = useState<DadosVenda | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState<string>(""); // qual upload está em progresso
  const [msgUpload, setMsgUpload] = useState("");
  const [cancelando, setCancelando] = useState(false);
  const [msgCancelamento, setMsgCancelamento] = useState("");
  const [distratoUrl, setDistratoUrl] = useState("");
  const sessao = getSessao();

  const carregar = () => {
    chamarApi({ acao: "rh_obter_fechamento", linha }).then((data: DadosVenda) => {
      if (data && data.ok) setDados(data);
      else setErro((data && data.erro) || "Não foi possível carregar os dados da venda.");
      setCarregando(false);
    });
  };
  useEffect(() => { carregar(); }, [linha]);

  const cliente = dados?.cliente;
  const autorizado = dados?.autorizado;
  const formas = dados?.formasPagamento || [];
  const valorTotal = formas.reduce((s, f) => s + (parseFloat((f.valor || "0").toString().replace(",", ".")) || 0), 0);

  const uploadArquivo = async (tipo: "contrato" | "video" | "comprovante", file: File, indice?: number) => {
    setEnviando(tipo + (indice !== undefined ? indice : ""));
    setMsgUpload("");
    try {
      const { base64, mimeType } = await arquivoParaBase64(file);
      const data = await chamarApi({
        acao: "rh_fechamento_upload_pos_trava",
        linha, tipo, indice, arquivoBase64: base64, mimeType,
      });
      if (data && data.ok) {
        setMsgUpload("✅ Enviado com sucesso!");
        carregar();
      } else {
        setMsgUpload("❌ " + ((data && data.erro) || "Erro ao enviar."));
      }
    } catch {
      setMsgUpload("❌ Erro ao ler o arquivo.");
    }
    setEnviando("");
  };

  const cancelarVenda = async () => {
    const confirmacao = window.confirm(
      "Tem certeza que quer CANCELAR esta venda?\n\nIsso dispara um alerta para os gestores e gera o Contrato de Distrato de Venda. Essa ação não pode ser desfeita pelo site."
    );
    if (!confirmacao) return;
    const senhaMaster = window.prompt("Senha master pra confirmar o cancelamento:");
    if (!senhaMaster) return;

    setCancelando(true);
    setMsgCancelamento("");
    const data = await chamarApi({
      acao: "rh_cancelar_venda",
      linha, senhaMaster, solicitante: sessao?.nome,
    });
    if (data && data.ok) {
      setMsgCancelamento("✅ Venda cancelada. Alerta enviado e Distrato de Venda gerado.");
      if (data.distratoUrl) setDistratoUrl(data.distratoUrl);
      carregar();
    } else {
      setMsgCancelamento("❌ " + ((data && data.erro) || "Erro ao cancelar a venda."));
    }
    setCancelando(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
          <X size={20} />
        </button>

        <h2 className="text-lg font-black mb-1 flex items-center gap-2">
          <Eye size={18} className="text-accent" /> Dados da <span className="text-accent">Venda</span>
        </h2>
        <p className="text-[11px] text-muted-foreground mb-4 flex items-center gap-1">
          {dados?.travado && <Lock size={11} />} Somente leitura. CÓD: {linha}
        </p>

        {carregando && <p className="text-sm text-muted-foreground">Carregando...</p>}
        {erro && <p className="text-sm text-accent">❌ {erro}</p>}

        {!carregando && !erro && (
          <div className="space-y-5">
            <div className="bg-white/5 border border-white/10 rounded-lg p-3">
              <p className="text-xs font-bold uppercase text-accent mb-1">🏪 Venda</p>
              <Linha label="Loja" value={dados?.lojaVenda} />
              <Linha label="Vendedor" value={dados?.vendedorNome} />
              <Linha label="Half (divide comissão)" value={dados?.halfVendedorNome} />
              <Linha label="SDR" value={dados?.sdrNome} />
            </div>

            <div className="bg-white/5 border border-white/10 rounded-lg p-3">
              <p className="text-xs font-bold uppercase text-accent mb-1">👤 Cliente</p>
              {cliente ? (
                <>
                  <Linha label="Nome" value={cliente.nome} />
                  <Linha label="CPF" value={cliente.cpf} />
                  <Linha label="RG" value={cliente.rg} />
                  <Linha label="Nascimento" value={cliente.nascimento} />
                  <Linha label="Nome do Pai" value={cliente.nomePai} />
                  <Linha label="Nome da Mãe" value={cliente.nomeMae} />
                  <Linha label="Telefone" value={cliente.telefone} />
                  <Linha label="Email" value={cliente.email} />
                  <Linha label="Endereço" value={cliente.endereco} />
                  <Linha label="Bairro" value={cliente.bairro} />
                  <Linha label="Cidade" value={cliente.cidade} />
                  <Linha label="Estado" value={cliente.estado} />
                  <Linha label="CEP" value={cliente.cep} />
                  <Linha label="Estado Civil" value={cliente.estadoCivil} />
                  <Linha label="Profissão" value={cliente.profissao} />
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhum cliente registrado ainda.</p>
              )}
            </div>

            {autorizado && (
              <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                <p className="text-xs font-bold uppercase text-accent mb-1">🔑 Autorizado (retirada por terceiros)</p>
                <Linha label="Nome" value={autorizado.nome} />
                <Linha label="CPF" value={autorizado.cpf} />
                <Linha label="RG" value={autorizado.rg} />
                <Linha label="Telefone" value={autorizado.telefone} />
                <Linha label="Email" value={autorizado.email} />
              </div>
            )}

            <div className="bg-white/5 border border-white/10 rounded-lg p-3">
              <p className="text-xs font-bold uppercase text-accent mb-1">💳 Formas de Pagamento</p>
              {formas.length ? (
                <>
                  <div className="space-y-2 text-sm">
                    {formas.map((f, i) => (
                      <div key={i} className="flex items-center justify-between gap-2">
                        <p className="text-muted-foreground">{descricaoForma(f)}</p>
                        {f.tipo === "entrada" && (
                          <div className="flex items-center gap-2 shrink-0">
                            {(f as any).comprovanteUrl && (
                              <a href={(f as any).comprovanteUrl} target="_blank" rel="noopener" className="text-[11px] text-accent underline">
                                Ver comprovante
                              </a>
                            )}
                            <label className="text-[11px] px-2 py-1 rounded bg-white/10 border border-white/10 cursor-pointer hover:border-accent flex items-center gap-1">
                              <Upload size={11} />
                              {enviando === "comprovante" + i ? "Enviando..." : (f as any).comprovanteUrl ? "Trocar" : "Enviar"}
                              <input
                                type="file" accept="image/*,application/pdf" className="hidden"
                                disabled={!!enviando}
                                onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadArquivo("comprovante", file, i); }}
                              />
                            </label>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between pt-2 mt-2 border-t border-white/10 text-sm">
                    <span className="font-bold">Total do contrato</span>
                    <span className="font-bold text-accent">{brl(valorTotal)}</span>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhuma forma de pagamento registrada ainda.</p>
              )}
            </div>

            {/* Anexos pós-fechamento — continuam liberados mesmo com a venda travada */}
            <div className="bg-accent/5 border border-accent/20 rounded-lg p-3 space-y-3">
              <p className="text-xs font-bold uppercase text-accent">📎 Anexos da Venda</p>

              <div className="flex items-center justify-between gap-2">
                <span className="text-sm flex items-center gap-1.5"><FileText size={14} /> Contrato assinado</span>
                <div className="flex items-center gap-2">
                  {dados?.contratoAssinadoUrl && (
                    <a href={dados.contratoAssinadoUrl} target="_blank" rel="noopener" className="text-[11px] text-accent underline">Ver</a>
                  )}
                  <label className="text-[11px] px-2 py-1 rounded bg-white/10 border border-white/10 cursor-pointer hover:border-accent flex items-center gap-1">
                    <Upload size={11} />
                    {enviando === "contrato" ? "Enviando..." : dados?.contratoAssinadoUrl ? "Trocar" : "Enviar"}
                    <input
                      type="file" accept="application/pdf,image/*" className="hidden"
                      disabled={!!enviando}
                      onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadArquivo("contrato", file); }}
                    />
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-sm flex items-center gap-1.5"><Video size={14} /> Vídeo declaratório</span>
                <div className="flex items-center gap-2">
                  {dados?.videoDeclaratorioUrl && (
                    <a href={dados.videoDeclaratorioUrl} target="_blank" rel="noopener" className="text-[11px] text-accent underline">Ver</a>
                  )}
                  <label className="text-[11px] px-2 py-1 rounded bg-white/10 border border-white/10 cursor-pointer hover:border-accent flex items-center gap-1">
                    <Upload size={11} />
                    {enviando === "video" ? "Enviando..." : dados?.videoDeclaratorioUrl ? "Trocar" : "Enviar"}
                    <input
                      type="file" accept="video/*" className="hidden"
                      disabled={!!enviando}
                      onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadArquivo("video", file); }}
                    />
                  </label>
                </div>
              </div>

              {msgUpload && <p className="text-xs">{msgUpload}</p>}
            </div>

            {dados?.travado && (
              <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3 space-y-2">
                <p className="text-xs font-bold uppercase text-red-400 flex items-center gap-1.5">
                  <AlertTriangle size={13} /> Zona de risco
                </p>
                <button
                  onClick={cancelarVenda}
                  disabled={cancelando}
                  className="w-full h-9 rounded-lg bg-red-500/20 border border-red-500/40 text-red-300 text-xs font-semibold hover:bg-red-500/30 disabled:opacity-60"
                >
                  {cancelando ? "Cancelando..." : "🚫 Cancelar Venda"}
                </button>
                <p className="text-[11px] text-muted-foreground">
                  Pede senha master, avisa os gestores e gera o Contrato de Distrato de Venda.
                </p>
                {msgCancelamento && <p className="text-xs">{msgCancelamento}</p>}
                {distratoUrl && (
                  <a href={distratoUrl} target="_blank" rel="noopener" className="block text-xs text-accent underline">
                    📄 Ver Distrato de Venda gerado
                  </a>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
