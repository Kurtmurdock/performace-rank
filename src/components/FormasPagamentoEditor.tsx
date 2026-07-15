"use client";

import { useState } from "react";
import { Plus, X, Upload, Check } from "lucide-react";

const BANCOS_FINANCIAMENTO = [
  "Itaú Financiamentos", "Balcão Itaú", "Banco BV", "Balcão BV",
  "Bradesco Financiamentos", "Santander Financiamentos", "Banco do Brasil",
  "Caixa Econômica Federal", "Safra Financeira", "Banco Pan", "Banco Honda",
  "Omni Financeira", "C6 Bank", "Banco Volkswagen",
];

const MEIOS_ENTRADA = ["PIX", "Cartão de Crédito", "Cartão de Débito", "Dinheiro"];

type Anexo = { base64: string; mimeType: string };

export type FormaEntrada = {
  tipo: "entrada"; meio: string; valor: string; repasse?: string;
  comprovante?: Anexo | null; comprovanteNome?: string;
};
export type FormaFinanciamento = {
  tipo: "financiamento"; banco: string; prestacoes: string; valorParcela: string; valor: string; repasse?: string;
};
export type FormaBoleto = {
  tipo: "boleto"; valor: string; vencimento: string; recorrencias: string;
};
export type FormaVeiculo = {
  tipo: "veiculo"; marca: string; modelo: string; placa: string; valor: string;
  fotos?: Anexo[]; fotosNomes?: string[]; documento?: Anexo | null; documentoNome?: string;
};
export type FormaPagamento = FormaEntrada | FormaFinanciamento | FormaBoleto | FormaVeiculo;

function arquivoParaBase64(file: File): Promise<Anexo> {
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

function brl(v: string) {
  const n = parseFloat((v || "0").toString().replace(/[R$\s.]/g, "").replace(",", "."));
  return isNaN(n) ? 0 : n;
}

export function FormasPagamentoEditor({
  value, onChange,
}: { value: FormaPagamento[]; onChange: (v: FormaPagamento[]) => void }) {
  const [escolhendoTipo, setEscolhendoTipo] = useState(false);

  const atualizar = (idx: number, patch: Partial<FormaPagamento>) => {
    const nova = value.map((f, i) => (i === idx ? { ...f, ...patch } : f)) as FormaPagamento[];
    onChange(nova);
  };
  const remover = (idx: number) => onChange(value.filter((_, i) => i !== idx));

  const adicionar = (tipo: FormaPagamento["tipo"]) => {
    let nova: FormaPagamento;
    if (tipo === "entrada") nova = { tipo: "entrada", meio: "", valor: "" };
    else if (tipo === "financiamento") nova = { tipo: "financiamento", banco: "", prestacoes: "", valorParcela: "", valor: "" };
    else if (tipo === "boleto") nova = { tipo: "boleto", valor: "", vencimento: "", recorrencias: "" };
    else nova = { tipo: "veiculo", marca: "", modelo: "", placa: "", valor: "" };
    onChange([...value, nova]);
    setEscolhendoTipo(false);
  };

  const somaComissao = value
    .filter((f) => f.tipo === "entrada" || f.tipo === "financiamento")
    .reduce((s, f) => s + brl((f as FormaEntrada | FormaFinanciamento).valor), 0);
  const somaTotal = value.reduce((s, f) => s + brl((f as { valor: string }).valor), 0);

  return (
    <div className="space-y-3">
      {value.map((f, idx) => (
        <div key={idx} className="bg-white/5 border border-white/10 rounded-lg p-3 space-y-2 relative">
          <button type="button" onClick={() => remover(idx)}
            className="absolute top-2 right-2 text-muted-foreground hover:text-accent">
            <X size={14} />
          </button>

          {f.tipo === "entrada" && (
            <>
              <p className="text-xs font-bold text-accent pr-6">💵 Entrada</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground">Meio</label>
                  <select value={f.meio} onChange={(e) => atualizar(idx, { meio: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg h-9 px-2 text-sm mt-1">
                    <option value="">—</option>
                    {MEIOS_ENTRADA.map((m) => <option key={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Valor (R$)</label>
                  <input value={f.valor} onChange={(e) => atualizar(idx, { valor: e.target.value })} placeholder="0,00"
                    className="w-full bg-white/5 border border-white/10 rounded-lg h-9 px-2 text-sm mt-1" />
                </div>
              </div>
              {f.meio === "Cartão de Crédito" && (
                <div>
                  <label className="text-xs text-muted-foreground">Repasse (opcional)</label>
                  <select value={f.repasse || ""} onChange={(e) => atualizar(idx, { repasse: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg h-9 px-2 text-sm mt-1">
                    <option value="">—</option>
                    <option>R1</option><option>R2</option><option>R3</option><option>R4</option><option>R5</option>
                  </select>
                </div>
              )}
              <UploadComprovante
                nome={f.comprovanteNome}
                onArquivo={async (file) => {
                  const anexo = await arquivoParaBase64(file);
                  atualizar(idx, { comprovante: anexo, comprovanteNome: file.name });
                }}
              />
            </>
          )}

          {f.tipo === "financiamento" && (
            <>
              <p className="text-xs font-bold text-accent pr-6">🏦 Financiamento</p>
              <div>
                <label className="text-xs text-muted-foreground">Banco</label>
                <select value={f.banco} onChange={(e) => atualizar(idx, { banco: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg h-9 px-2 text-sm mt-1">
                  <option value="">—</option>
                  {BANCOS_FINANCIAMENTO.map((b) => <option key={b}>{b}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground">Nº de prestações</label>
                  <input value={f.prestacoes} onChange={(e) => atualizar(idx, { prestacoes: e.target.value })} placeholder="Ex: 48"
                    className="w-full bg-white/5 border border-white/10 rounded-lg h-9 px-2 text-sm mt-1" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Valor da Parcela (R$)</label>
                  <input value={f.valorParcela} onChange={(e) => atualizar(idx, { valorParcela: e.target.value })} placeholder="0,00 (com juros)"
                    className="w-full bg-white/5 border border-white/10 rounded-lg h-9 px-2 text-sm mt-1" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-accent">💰 Valor Financiado (R$)</label>
                <input value={f.valor} onChange={(e) => atualizar(idx, { valor: e.target.value })} placeholder="0,00"
                  className="w-full bg-white/5 border border-accent/40 rounded-lg h-9 px-2 text-sm mt-1" />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Valor que a loja recebe do banco (sem os juros da parcela) — esse é o que conta na venda.
                </p>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Repasse (opcional)</label>
                <select value={f.repasse || ""} onChange={(e) => atualizar(idx, { repasse: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg h-9 px-2 text-sm mt-1">
                  <option value="">—</option>
                  <option>R1</option><option>R2</option><option>R3</option><option>R4</option><option>R5</option>
                </select>
              </div>
            </>
          )}

          {f.tipo === "boleto" && (
            <>
              <p className="text-xs font-bold text-accent pr-6">🧾 Boleto</p>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground">Valor (R$)</label>
                  <input value={f.valor} onChange={(e) => atualizar(idx, { valor: e.target.value })} placeholder="0,00"
                    className="w-full bg-white/5 border border-white/10 rounded-lg h-9 px-2 text-sm mt-1" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Vencimento</label>
                  <input type="date" value={f.vencimento} onChange={(e) => atualizar(idx, { vencimento: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg h-9 px-2 text-sm mt-1" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Nº recorrências</label>
                  <input value={f.recorrencias} onChange={(e) => atualizar(idx, { recorrencias: e.target.value })} placeholder="Ex: 3"
                    className="w-full bg-white/5 border border-white/10 rounded-lg h-9 px-2 text-sm mt-1" />
                </div>
              </div>
              <p className="text-[11px] text-orange-400">⚠️ Não soma na comissão — só no valor total do contrato.</p>
            </>
          )}

          {f.tipo === "veiculo" && (
            <>
              <p className="text-xs font-bold text-accent pr-6">🔄 Veículo na Troca</p>
              <div className="grid grid-cols-2 gap-2">
                <input value={f.marca} onChange={(e) => atualizar(idx, { marca: e.target.value })} placeholder="Marca"
                  className="bg-white/5 border border-white/10 rounded-lg h-9 px-2 text-sm" />
                <input value={f.modelo} onChange={(e) => atualizar(idx, { modelo: e.target.value })} placeholder="Modelo"
                  className="bg-white/5 border border-white/10 rounded-lg h-9 px-2 text-sm" />
                <input value={f.placa} onChange={(e) => atualizar(idx, { placa: e.target.value })} placeholder="Placa"
                  className="bg-white/5 border border-white/10 rounded-lg h-9 px-2 text-sm" />
                <input value={f.valor} onChange={(e) => atualizar(idx, { valor: e.target.value })} placeholder="Valor atribuído (R$)"
                  className="bg-white/5 border border-white/10 rounded-lg h-9 px-2 text-sm" />
              </div>
              <p className="text-[11px] text-orange-400">
                🔒 Vai virar uma moto nova no estoque, bloqueada pra venda até liberação com senha master.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <label className="h-9 rounded-lg bg-white/5 border border-white/10 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer hover:border-accent">
                  <Upload size={12} /> {f.fotosNomes?.length ? `${f.fotosNomes.length} foto(s)` : "Fotos"}
                  <input type="file" accept="image/*" multiple className="hidden" onChange={async (e) => {
                    const files = Array.from(e.target.files || []);
                    if (!files.length) return;
                    const anexos = await Promise.all(files.map(arquivoParaBase64));
                    atualizar(idx, { fotos: anexos, fotosNomes: files.map((f2) => f2.name) });
                  }} />
                </label>
                <label className="h-9 rounded-lg bg-white/5 border border-white/10 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer hover:border-accent">
                  {f.documentoNome ? <Check size={12} /> : <Upload size={12} />} {f.documentoNome || "Documento (CRLV)"}
                  <input type="file" accept="image/*,application/pdf" className="hidden" onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const anexo = await arquivoParaBase64(file);
                    atualizar(idx, { documento: anexo, documentoNome: file.name });
                  }} />
                </label>
              </div>
            </>
          )}
        </div>
      ))}

      {escolhendoTipo ? (
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => adicionar("entrada")}
            className="h-9 rounded-lg bg-white/5 border border-white/10 text-xs font-semibold hover:border-accent">💵 Entrada</button>
          <button type="button" onClick={() => adicionar("financiamento")}
            className="h-9 rounded-lg bg-white/5 border border-white/10 text-xs font-semibold hover:border-accent">🏦 Financiamento</button>
          <button type="button" onClick={() => adicionar("boleto")}
            className="h-9 rounded-lg bg-white/5 border border-white/10 text-xs font-semibold hover:border-accent">🧾 Boleto</button>
          <button type="button" onClick={() => adicionar("veiculo")}
            className="h-9 rounded-lg bg-white/5 border border-white/10 text-xs font-semibold hover:border-accent">🔄 Veículo (Troca)</button>
        </div>
      ) : (
        <button type="button" onClick={() => setEscolhendoTipo(true)}
          className="w-full h-9 rounded-lg bg-accent/10 border border-accent/30 text-accent text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-accent/20">
          <Plus size={13} /> Adicionar Forma de Pagamento
        </button>
      )}

      {value.length > 0 && (
        <div className="bg-white/5 rounded-lg p-3 text-xs space-y-1">
          <p className="text-muted-foreground">Base da comissão (Entrada + Financiamento): <span className="font-bold text-foreground">R$ {somaComissao.toFixed(2).replace(".", ",")}</span></p>
          <p className="text-muted-foreground">Valor total do contrato (tudo somado): <span className="font-bold text-accent">R$ {somaTotal.toFixed(2).replace(".", ",")}</span></p>
        </div>
      )}
    </div>
  );
}

function UploadComprovante({ nome, onArquivo }: { nome?: string; onArquivo: (file: File) => void }) {
  return (
    <label className="h-9 rounded-lg bg-white/5 border border-white/10 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer hover:border-accent">
      {nome ? <Check size={12} /> : <Upload size={12} />} {nome || "Comprovante"}
      <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) onArquivo(file);
      }} />
    </label>
  );
}
