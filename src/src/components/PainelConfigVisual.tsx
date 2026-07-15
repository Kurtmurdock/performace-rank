"use client";

import { useEffect, useState } from "react";
import { X, Upload } from "lucide-react";
import { chamarApi } from "@/lib/sessao";

const PAGINAS = [
  { chave: "rank", label: "Rank de Vendas" },
  { chave: "estoque", label: "Estoque" },
  { chave: "financeiro", label: "Financeiro" },
  { chave: "eventos", label: "Eventos" },
];

type ConfigPagina = {
  corFundo?: string;
  midiaFundoUrl?: string;
  midiaFundoTipo?: string;
  corBotao?: string;
  fonte?: string;
};

export function PainelConfigVisual({ onClose, sessao }: { onClose: () => void; sessao: any }) {
  const [paginaAtiva, setPaginaAtiva] = useState(PAGINAS[0].chave);
  const [configuracoes, setConfiguracoes] = useState<Record<string, ConfigPagina>>({});
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState("");

  const [corFundo, setCorFundo] = useState("");
  const [corBotao, setCorBotao] = useState("");
  const [fonte, setFonte] = useState("");

  const carregar = () => {
    setCarregando(true);
    chamarApi({ acao: "config_visual_listar" }).then((data) => {
      if (data && data.ok) {
        setConfiguracoes(data.configuracoes || {});
        const atual = (data.configuracoes || {})[paginaAtiva] || {};
        setCorFundo(atual.corFundo || "");
        setCorBotao(atual.corBotao || "");
        setFonte(atual.fonte || "");
      }
      setCarregando(false);
    });
  };
  useEffect(() => { carregar(); }, []);

  useEffect(() => {
    const atual = configuracoes[paginaAtiva] || {};
    setCorFundo(atual.corFundo || "");
    setCorBotao(atual.corBotao || "");
    setFonte(atual.fonte || "");
  }, [paginaAtiva]);

  const salvar = async () => {
    setSalvando(true);
    setMsg("");
    const data = await chamarApi({
      acao: "config_visual_salvar",
      pagina: paginaAtiva,
      corFundo, corBotao, fonte,
      solicitante: sessao?.nome,
    });
    if (data && data.ok) {
      setMsg("✅ Salvo!");
      carregar();
    } else {
      setMsg("❌ " + ((data && data.erro) || "Erro ao salvar"));
    }
    setSalvando(false);
  };

  const uploadMidia = (e: React.ChangeEvent<HTMLInputElement>) => {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = (ev.target?.result as string).split(",")[1];
      setSalvando(true);
      const data = await chamarApi({
        acao: "config_visual_upload_midia",
        pagina: paginaAtiva,
        arquivoBase64: base64,
        mimeType: arquivo.type,
        midiaFundoTipo: arquivo.type.startsWith("video") ? "video" : "imagem",
        solicitante: sessao?.nome,
      });
      if (data && data.ok) {
        setMsg("✅ Mídia enviada!");
        carregar();
      } else {
        setMsg("❌ " + ((data && data.erro) || "Erro ao enviar mídia"));
      }
      setSalvando(false);
    };
    reader.readAsDataURL(arquivo);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
          <X size={20} />
        </button>
        <h2 className="text-xl font-black mb-4">🎨 <span className="text-accent">Configurações Visuais</span></h2>

        <div className="flex flex-wrap gap-2 mb-4">
          {PAGINAS.map((p) => (
            <button key={p.chave} onClick={() => setPaginaAtiva(p.chave)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${paginaAtiva === p.chave ? "bg-accent text-white" : "bg-white/5 text-muted-foreground"}`}>
              {p.label}
            </button>
          ))}
        </div>

        {carregando ? (
          <p className="text-muted-foreground text-sm">Carregando...</p>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground">Cor de fundo (hex)</label>
              <input value={corFundo} onChange={(e) => setCorFundo(e.target.value)} placeholder="#0F172A"
                className="w-full bg-white/5 border border-white/10 rounded-lg h-9 px-3 text-sm mt-1" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Cor de destaque/botões (hex)</label>
              <input value={corBotao} onChange={(e) => setCorBotao(e.target.value)} placeholder="#DC2626"
                className="w-full bg-white/5 border border-white/10 rounded-lg h-9 px-3 text-sm mt-1" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Fonte (nome CSS)</label>
              <input value={fonte} onChange={(e) => setFonte(e.target.value)} placeholder="Inter, sans-serif"
                className="w-full bg-white/5 border border-white/10 rounded-lg h-9 px-3 text-sm mt-1" />
            </div>

            <div>
              <label className="text-xs text-muted-foreground block mb-1.5">Mídia de fundo (imagem ou vídeo)</label>
              {configuracoes[paginaAtiva]?.midiaFundoUrl && (
                <p className="text-xs text-accent mb-1.5">✓ Já tem mídia configurada</p>
              )}
              <label className="flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-lg py-3 cursor-pointer hover:border-accent transition-colors">
                <Upload size={14} className="text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Escolher arquivo</span>
                <input type="file" accept="image/*,video/*" className="hidden" onChange={uploadMidia} />
              </label>
            </div>

            {msg && <p className="text-sm">{msg}</p>}
            <button onClick={salvar} disabled={salvando} className="w-full h-10 rounded-lg bg-accent text-white font-bold text-sm disabled:opacity-60">
              {salvando ? "Salvando..." : "💾 Salvar"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
