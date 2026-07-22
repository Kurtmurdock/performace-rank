"use client";

import { useState } from "react";
import { X, ArrowLeft, ArrowRight } from "lucide-react";
import { chamarApi, getSessao } from "@/lib/sessao";
import type { Cliente } from "@/components/ClienteBusca";

const ESTADOS_CIVIS = ["Solteiro(a)", "Casado(a)", "Divorciado(a)", "Viúvo(a)", "União Estável"];

// Valida CPF de verdade (dígito verificador), não só formato — evita
// gente digitando CPF errado sem perceber até o cadastro falhar depois.
function cpfValido(cpfBruto: string): boolean {
  const cpf = (cpfBruto || "").replace(/\D/g, "");
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  let soma = 0;
  for (let i = 0; i < 9; i++) soma += parseInt(cpf[i]) * (10 - i);
  let resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf[9])) return false;
  soma = 0;
  for (let i = 0; i < 10; i++) soma += parseInt(cpf[i]) * (11 - i);
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  return resto === parseInt(cpf[10]);
}

const ETAPAS = [
  { titulo: "Dados Pessoais", campos: ["nome", "cpf", "rg", "nascimento"] },
  { titulo: "Complemento", campos: ["estadoCivil", "profissao", "nomePai", "nomeMae"] },
  { titulo: "Contato", campos: ["telefone", "email"] },
  { titulo: "Endereço", campos: ["endereco", "bairro", "cidade", "estado", "cep"] },
] as const;

const LABELS: Record<string, string> = {
  nome: "Nome completo", cpf: "CPF", rg: "RG", nascimento: "Data de nascimento",
  estadoCivil: "Estado Civil", profissao: "Profissão", nomePai: "Nome do Pai", nomeMae: "Nome da Mãe",
  telefone: "Telefone", email: "Email", endereco: "Endereço", bairro: "Bairro",
  cidade: "Cidade", estado: "Estado", cep: "CEP",
};

export function ClienteWizardModal({
  onClose, onCadastrado,
}: { onClose: () => void; onCadastrado: (cliente: Cliente) => void }) {
  const sessao = getSessao();
  const [etapa, setEtapa] = useState(0);
  const [dados, setDados] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState("");

  const setCampo = (chave: string, valor: string) => setDados((d) => ({ ...d, [chave]: valor }));

  const etapaAtual = ETAPAS[etapa];
  const ultimaEtapa = etapa === ETAPAS.length - 1;

  const validarEtapaAtual = () => {
    if (etapa === 0) return !!(dados.nome && dados.cpf && cpfValido(dados.cpf) && dados.rg && dados.nascimento);
    return true; // demais etapas: campos complementares, não bloqueiam avanço
  };

  const avancar = () => {
    if (!validarEtapaAtual()) {
      setMsg(dados.cpf && !cpfValido(dados.cpf) ? "❌ CPF inválido — confira os números." : "❌ Preencha nome, CPF, RG e nascimento antes de continuar.");
      return;
    }
    setMsg("");
    setEtapa((e) => Math.min(e + 1, ETAPAS.length - 1));
  };

  const voltar = () => setEtapa((e) => Math.max(e - 1, 0));

  const finalizar = async () => {
    if (!validarEtapaAtual()) {
      setMsg("❌ Preencha nome, CPF, RG e nascimento antes de cadastrar.");
      setEtapa(0);
      return;
    }
    setSalvando(true);
    setMsg("");
    const cliente = dados as unknown as Cliente;
    const data = await chamarApi({ acao: "rh_cliente_cadastrar", cliente, solicitante: sessao?.nome });
    if (data && data.ok) {
      setMsg("✅ Cliente cadastrado com sucesso!");
      setTimeout(() => { onCadastrado(cliente); onClose(); }, 700);
    } else {
      setMsg("❌ " + ((data && data.erro) || "Erro ao cadastrar cliente."));
    }
    setSalvando(false);
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-card border border-border rounded-2xl max-w-lg w-full my-8">
        <div className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black">+ CADASTRAR <span className="text-accent">CLIENTE</span></h3>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
          </div>

          {/* Barra de progresso */}
          <div className="flex items-center gap-1.5">
            {ETAPAS.map((e, i) => (
              <div key={e.titulo} className={`h-1.5 flex-1 rounded-full ${i <= etapa ? "bg-accent" : "bg-white/10"}`} />
            ))}
          </div>
          <p className="text-xs text-muted-foreground -mt-3">Etapa {etapa + 1} de {ETAPAS.length} — {etapaAtual.titulo}</p>

          <div className="grid grid-cols-2 gap-3">
            {etapaAtual.campos.map((chave) => (
              <div key={chave} className={chave === "nome" || chave === "endereco" ? "col-span-2" : ""}>
                <label className="text-xs text-muted-foreground">{LABELS[chave]}</label>
                {chave === "estadoCivil" ? (
                  <select value={dados[chave] || ""} onChange={(e) => setCampo(chave, e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg h-9 px-2 text-sm mt-1">
                    <option value="">—</option>
                    {ESTADOS_CIVIS.map((ec) => <option key={ec}>{ec}</option>)}
                  </select>
                ) : (
                  <input value={dados[chave] || ""} onChange={(e) => setCampo(chave, e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg h-9 px-2 text-sm mt-1" />
                )}
                {chave === "cpf" && dados.cpf && dados.cpf.replace(/\D/g, "").length >= 11 && (
                  <p className={`text-[11px] mt-1 ${cpfValido(dados.cpf) ? "text-green-400" : "text-accent"}`}>
                    {cpfValido(dados.cpf) ? "✓ CPF válido" : "✗ CPF inválido — confira os números"}
                  </p>
                )}
              </div>
            ))}
          </div>

          {msg && <p className="text-sm">{msg}</p>}

          <div className="flex items-center justify-between pt-2">
            <button type="button" onClick={voltar} disabled={etapa === 0}
              className="h-10 px-4 rounded-lg bg-white/5 border border-white/10 text-sm font-semibold flex items-center gap-1 disabled:opacity-40">
              <ArrowLeft size={14} /> Voltar
            </button>
            {ultimaEtapa ? (
              <button type="button" onClick={finalizar} disabled={salvando}
                className="h-10 px-5 rounded-lg bg-accent text-white text-sm font-bold disabled:opacity-60">
                {salvando ? "Salvando..." : "✅ Cadastrar"}
              </button>
            ) : (
              <button type="button" onClick={avancar}
                className="h-10 px-5 rounded-lg bg-accent text-white text-sm font-bold flex items-center gap-1">
                Próximo <ArrowRight size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
