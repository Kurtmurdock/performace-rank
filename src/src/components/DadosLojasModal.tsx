"use client";

import { useEffect, useState } from "react";
import { X, ArrowLeft, Upload } from "lucide-react";
import { chamarApi } from "@/lib/sessao";

type Loja = {
  nome: string; cnpj?: string; endereco?: string; bairro?: string; cidade?: string;
  estado?: string; cep?: string; telefone?: string; logoUrl?: string;
};

export function DadosLojasModal({ onClose, sessao }: { onClose: () => void; sessao: any }) {
  const [lojas, setLojas] = useState<Loja[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [lojaEditando, setLojaEditando] = useState<Loja | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState("");

  const carregar = () => {
    setCarregando(true);
    chamarApi({ acao: "rh_listar_lojas" }).then((data) => {
      if (data && data.ok) setLojas(data.lojas || []);
      setCarregando(false);
    });
  };
  useEffect(() => { carregar(); }, []);

  const salvar = async () => {
    if (!lojaEditando) return;
    setSalvando(true);
    setMsg("");
    const data = await chamarApi({
      acao: "rh_salvar_loja",
      ...lojaEditando,
      solicitante: sessao?.nome,
    });
    if (data && data.ok) {
      setMsg("✅ Salvo!");
      carregar();
      setTimeout(() => setLojaEditando(null), 600);
    } else {
      setMsg("❌ " + ((data && data.erro) || "Erro ao salvar"));
    }
    setSalvando(false);
  };

  const uploadLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const arquivo = e.target.files?.[0];
    if (!arquivo || !lojaEditando) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = (ev.target?.result as string).split(",")[1];
      setSalvando(true);
      const data = await chamarApi({
        acao: "rh_upload_logo_loja",
        nome: lojaEditando.nome,
        arquivoBase64: base64,
        mimeType: arquivo.type,
        solicitante: sessao?.nome,
      });
      if (data && data.ok) {
        setLojaEditando((l) => (l ? { ...l, logoUrl: data.logoUrl } : l));
        setMsg("✅ Logo enviada!");
      } else {
        setMsg("❌ " + ((data && data.erro) || "Erro ao enviar logo"));
      }
      setSalvando(false);
    };
    reader.readAsDataURL(arquivo);
  };

  const campo = (label: string, chave: keyof Loja, placeholder?: string) => (
    <div>
      <label className="text-xs text-muted-foreground">{label}</label>
      <input
        value={(lojaEditando?.[chave] as string) || ""}
        onChange={(e) => setLojaEditando((l) => (l ? { ...l, [chave]: e.target.value } : l))}
        placeholder={placeholder}
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

        {!lojaEditando ? (
          <>
            <h2 className="text-xl font-black mb-4">🏪 <span className="text-accent">Dados das Lojas</span></h2>
            {carregando && <p className="text-muted-foreground text-sm">Carregando...</p>}
            <div className="space-y-2">
              {lojas.map((l) => {
                const completo = l.cnpj && l.endereco;
                return (
                  <button
                    key={l.nome}
                    onClick={() => setLojaEditando(l)}
                    className="w-full flex items-center gap-3 bg-white/5 border border-white/10 rounded-lg p-3 hover:border-accent transition-colors text-left"
                  >
                    {l.logoUrl ? (
                      <img src={l.logoUrl} className="w-8 h-8 object-contain rounded bg-white" />
                    ) : (
                      <div className="w-8 h-8 rounded bg-white/10" />
                    )}
                    <span className="font-semibold text-sm flex-1">{l.nome}</span>
                    <span className={`text-xs ${completo ? "text-green-400" : "text-orange-400"}`}>
                      {completo ? "✓ completo" : "⚠ incompleto"}
                    </span>
                  </button>
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

            <div className="flex items-center gap-3 mb-4">
              {lojaEditando.logoUrl ? (
                <img src={lojaEditando.logoUrl} className="w-14 h-14 object-contain rounded bg-white border border-white/10" />
              ) : (
                <div className="w-14 h-14 rounded bg-white/10 border border-white/10" />
              )}
              <label className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs cursor-pointer hover:border-accent">
                <Upload size={13} /> Trocar logo
                <input type="file" accept="image/*" className="hidden" onChange={uploadLogo} />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {campo("CNPJ", "cnpj")}
              {campo("Telefone", "telefone")}
              <div className="col-span-2">{campo("Endereço (rua, número)", "endereco")}</div>
              {campo("Bairro", "bairro")}
              {campo("Cidade", "cidade")}
              {campo("Estado (UF)", "estado")}
              {campo("CEP", "cep")}
            </div>

            {msg && <p className="text-sm mt-3">{msg}</p>}
            <button onClick={salvar} disabled={salvando} className="w-full h-10 rounded-lg bg-accent text-white font-bold text-sm mt-4 disabled:opacity-60">
              {salvando ? "Salvando..." : "💾 Salvar Loja"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
