"use client";

import { useEffect, useState } from "react";
import { X, ArrowLeft, Plus } from "lucide-react";
import { chamarApi, getSessao } from "@/lib/sessao";

type Loja = {
  nome: string; cnpj?: string; endereco?: string; bairro?: string; cidade?: string;
  estado?: string; cep?: string; telefone?: string; logoUrl?: string; ativo: boolean;
};

export function AdministrativoModal({ onClose }: { onClose: () => void }) {
  const sessao = getSessao();

  const [senhaOk, setSenhaOk] = useState(false);
  const [senhaDigitada, setSenhaDigitada] = useState("");
  const [senhaValidada, setSenhaValidada] = useState("");
  const [erroSenha, setErroSenha] = useState("");
  const [validando, setValidando] = useState(false);

  const [lojas, setLojas] = useState<Loja[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [nomeNovaEmpresa, setNomeNovaEmpresa] = useState("");
  const [lojaEditando, setLojaEditando] = useState<Loja | null>(null);
  const [msg, setMsg] = useState("");
  const [salvando, setSalvando] = useState(false);

  const conferirSenha = async () => {
    setValidando(true);
    setErroSenha("");
    const data = await chamarApi({ acao: "rh_validar_senha_master", senhaMaster: senhaDigitada });
    if (data && data.ok) {
      setSenhaValidada(senhaDigitada);
      setSenhaOk(true);
    } else if (data && data.erro) {
      // Erro real do backend (ex: ação não reconhecida = versão antiga ainda
      // implantada) — mostra isso em vez de sempre dizer "senha incorreta",
      // pra dar pra diferenciar os dois casos.
      setErroSenha("❌ " + data.erro);
    } else {
      setErroSenha("❌ Senha incorreta.");
    }
    setValidando(false);
  };

  const carregar = () => {
    setCarregando(true);
    chamarApi({ acao: "rh_listar_lojas", incluirInativas: true }).then((data) => {
      if (data && data.ok) setLojas(data.lojas || []);
      setCarregando(false);
    });
  };
  useEffect(() => { if (senhaOk) carregar(); }, [senhaOk]);

  const cadastrarEmpresa = async () => {
    if (!nomeNovaEmpresa.trim()) { setMsg("❌ Digite o nome da empresa."); return; }
    setMsg("Cadastrando...");
    const data = await chamarApi({ acao: "rh_cadastrar_loja_grupo", nome: nomeNovaEmpresa.trim(), senhaMaster: senhaValidada, solicitante: sessao?.nome });
    if (data && data.ok) {
      setMsg("✅ Empresa cadastrada! Já aparece em todo o site.");
      setNomeNovaEmpresa("");
      carregar();
    } else {
      setMsg("❌ " + ((data && data.erro) || "Erro ao cadastrar."));
    }
  };

  const descadastrarEmpresa = async (loja: Loja) => {
    if (!confirm(`Descadastrar "${loja.nome}" do grupo? Ela deixa de aparecer nas listas de loja em todo o site (histórico antigo não é afetado).`)) return;
    const data = await chamarApi({ acao: "rh_descadastrar_loja_grupo", nome: loja.nome, senhaMaster: senhaValidada, solicitante: sessao?.nome });
    if (data && data.ok) carregar();
    else alert("❌ " + ((data && data.erro) || "Erro ao descadastrar."));
  };

  const reativarEmpresa = async (loja: Loja) => {
    const data = await chamarApi({ acao: "rh_descadastrar_loja_grupo", nome: loja.nome, reativar: true, senhaMaster: senhaValidada, solicitante: sessao?.nome });
    if (data && data.ok) carregar();
    else alert("❌ " + ((data && data.erro) || "Erro ao reativar."));
  };

  const salvarEdicao = async () => {
    if (!lojaEditando) return;
    setSalvando(true);
    const data = await chamarApi({ acao: "rh_salvar_loja", ...lojaEditando, senhaMaster: senhaValidada, solicitante: sessao?.nome });
    if (data && data.ok) {
      setMsg("✅ Salvo!");
      carregar();
      setTimeout(() => setLojaEditando(null), 500);
    } else {
      setMsg("❌ " + ((data && data.erro) || "Erro ao salvar."));
    }
    setSalvando(false);
  };

  const campo = (label: string, chave: keyof Loja) => (
    <div>
      <label className="text-xs text-muted-foreground">{label}</label>
      <input
        value={(lojaEditando?.[chave] as string) || ""}
        onChange={(e) => setLojaEditando((l) => (l ? { ...l, [chave]: e.target.value } : l))}
        className="w-full bg-white/5 border border-white/10 rounded-lg h-9 px-3 text-sm mt-1"
      />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
          <X size={20} />
        </button>

        {!senhaOk ? (
          <div className="max-w-xs mx-auto py-8">
            <h2 className="text-xl font-black mb-4 text-center">🔒 <span className="text-accent">Administrativo</span></h2>
            <input
              type="password" placeholder="Senha" value={senhaDigitada}
              onChange={(e) => setSenhaDigitada(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && conferirSenha()}
              autoComplete="new-password"
              name="performace-administrativo-senha"
              className="w-full bg-white/5 border border-white/10 rounded-lg h-10 px-3 text-sm mb-3"
            />
            {erroSenha && <p className="text-sm mb-2 text-center">{erroSenha}</p>}
            <button onClick={conferirSenha} disabled={validando} className="w-full h-10 rounded-lg bg-accent text-white font-bold text-sm disabled:opacity-60">
              {validando ? "Verificando..." : "Entrar"}
            </button>
          </div>
        ) : !lojaEditando ? (
          <>
            <h2 className="text-xl font-black mb-4">⚙️ <span className="text-accent">Administrativo</span></h2>

            <div className="flex gap-2 mb-6">
              <input placeholder="Nome da nova empresa" value={nomeNovaEmpresa} onChange={(e) => setNomeNovaEmpresa(e.target.value)}
                className="flex-1 bg-white/5 border border-white/10 rounded-lg h-9 px-3 text-sm" />
              <button onClick={cadastrarEmpresa} className="h-9 px-3 rounded-lg bg-accent text-white text-xs font-semibold flex items-center gap-1">
                <Plus size={13} /> Cadastrar
              </button>
            </div>
            {msg && <p className="text-sm mb-3">{msg}</p>}

            {carregando && <p className="text-muted-foreground text-sm">Carregando...</p>}
            <div className="space-y-2">
              {lojas.map((l) => {
                const completo = l.cnpj && l.endereco;
                return (
                  <div key={l.nome} className={`flex items-center gap-3 border rounded-lg p-3 ${l.ativo ? "bg-white/5 border-white/10" : "bg-red-500/5 border-red-500/20 opacity-60"}`}>
                    <span className="font-semibold text-sm flex-1">{l.nome}</span>
                    {l.ativo ? (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${completo ? "bg-green-500/20 text-green-400" : "bg-orange-500/20 text-orange-400"}`}>
                        {completo ? "✓ completo" : "⚠ incompleto"}
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">descadastrada</span>
                    )}
                    <button onClick={() => setLojaEditando(l)} className="text-xs text-accent underline shrink-0">Editar</button>
                    {l.ativo ? (
                      <button onClick={() => descadastrarEmpresa(l)} className="text-xs text-red-400 underline shrink-0">Descadastrar</button>
                    ) : (
                      <button onClick={() => reativarEmpresa(l)} className="text-xs text-green-400 underline shrink-0">Reativar</button>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <>
            <button onClick={() => setLojaEditando(null)} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-accent mb-3">
              <ArrowLeft size={13} /> Voltar
            </button>
            <h2 className="text-lg font-black mb-4">Editando: <span className="text-accent">{lojaEditando.nome}</span></h2>
            <div className="grid grid-cols-2 gap-3">
              {campo("CNPJ", "cnpj")}
              {campo("Telefone", "telefone")}
              <div className="col-span-2">{campo("Endereço", "endereco")}</div>
              {campo("Bairro", "bairro")}
              {campo("Cidade", "cidade")}
              {campo("Estado (UF)", "estado")}
              {campo("CEP", "cep")}
            </div>
            {msg && <p className="text-sm mt-3">{msg}</p>}
            <button onClick={salvarEdicao} disabled={salvando} className="w-full h-10 rounded-lg bg-accent text-white font-bold text-sm mt-4 disabled:opacity-60">
              {salvando ? "Salvando..." : "💾 Salvar"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
