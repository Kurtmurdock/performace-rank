"use client";

import { useEffect, useState } from "react";
import { X, Palette, Image as ImageIcon, Type, Save } from "lucide-react";
import { chamarApi } from "@/lib/sessao";

const PAGINAS = [
  { valor: "rank", nome: "Rank de Vendas" },
  { valor: "login", nome: "Login" },
  { valor: "estoque", nome: "Estoque" },
  { valor: "perfil", nome: "Meu Perfil" },
  { valor: "financeiro", nome: "Painel Financeiro" },
  { valor: "rh", nome: "RH / Gerência" },
  { valor: "eventos", nome: "Eventos" },
  { valor: "leads", nome: "Leads" },
  { valor: "conexao", nome: "Conexão" },
  { valor: "documentacao", nome: "Documentação" },
  { valor: "rotinas", nome: "Rotinas" },
  { valor: "anuncios", nome: "Monitor de Anúncios" },
];

const FONTES = ["Padrão (sistema)", "Arial", "Georgia", "Courier New", "Verdana", "Trebuchet MS"];

export function PainelConfigVisual({ onClose, sessao }: { onClose: () => void; sessao: any }) {
  const [senhaMaster, setSenhaMaster] = useState("");
  const [autenticado, setAutenticado] = useState(false);
  const [erroSenha, setErroSenha] = useState("");

  const [paginaAtiva, setPaginaAtiva] = useState("rank");
  const [configs, setConfigs] = useState<Record<string, any>>({});
  const [corFundo, setCorFundo] = useState("");
  const [corBotao, setCorBotao] = useState("");
  const [fonte, setFonte] = useState("");
  const [midiaUrl, setMidiaUrl] = useState("");
  const [midiaTipo, setMidiaTipo] = useState("");
  const [enviandoMidia, setEnviandoMidia] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!autenticado) return;
    chamarApi({ acao: "config_visual_listar" }).then((data) => {
      if (data && data.ok) setConfigs(data.configuracoes || {});
    });
  }, [autenticado]);

  useEffect(() => {
    const c = configs[paginaAtiva];
    setCorFundo(c?.corFundo || "");
    setCorBotao(c?.corBotao || "");
    setFonte(c?.fonte || "");
    setMidiaUrl(c?.midiaFundoUrl || "");
    setMidiaTipo(c?.midiaFundoTipo || "");
  }, [paginaAtiva, configs]);

  const entrar = () => {
    if (sessao?.cargo === "gestor" || senhaMaster) {
      setAutenticado(true);
      setErroSenha("");
    } else {
      setErroSenha("Digite a senha master.");
    }
  };

  const uploadMidia = (file: File) => {
    setEnviandoMidia(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = (e.target?.result as string).split(",")[1];
      const data = await chamarApi({
        acao: "config_visual_upload_midia",
        pagina: paginaAtiva,
        solicitante: sessao?.nome,
        senhaMaster,
        arquivoBase64: base64,
        mimeType: file.type,
      });
      if (data && data.ok) {
        setMidiaUrl(data.midiaUrl);
        setMidiaTipo(data.tipo);
        setMsg("✅ Mídia enviada!");
      } else {
        setMsg("❌ " + ((data && data.erro) || "Erro ao enviar mídia."));
      }
      setEnviandoMidia(false);
    };
    reader.readAsDataURL(file);
  };

  const salvar = async () => {
    setSalvando(true);
    setMsg("");
    const data = await chamarApi({
      acao: "config_visual_salvar",
      pagina: paginaAtiva,
      solicitante: sessao?.nome,
      senhaMaster,
      corFundo, corBotao, fonte,
      midiaFundoTipo: midiaTipo,
    });
    if (data && data.ok) setMsg("✅ Configuração salva! Recarregue a página pra ver o efeito.");
    else setMsg("❌ " + ((data && data.erro) || "Erro ao salvar."));
    setSalvando(false);
  };

  if (!autenticado) {
    return (
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-card border border-border rounded-2xl max-w-xs w-full p-6 relative">
          <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground"><X size={20} /></button>
          <h2 className="text-lg font-black mb-1">🎨 CONFIGURAÇÕES <span className="text-accent">VISUAIS</span></h2>
          <p className="text-xs text-muted-foreground mb-4">Área protegida — só gestores</p>
          <input
            type="password"
            placeholder="Senha master"
            value={senhaMaster}
            onChange={(e) => setSenhaMaster(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && entrar()}
            className="w-full bg-white/5 border border-white/10 rounded-lg h-10 px-3 text-sm mb-2"
          />
          {erroSenha && <p className="text-accent text-sm mb-2">{erroSenha}</p>}
          <button onClick={entrar} className="w-full h-10 rounded-lg bg-accent text-white font-bold text-sm">Entrar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-card border border-border rounded-2xl max-w-2xl w-full my-8 p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground"><X size={20} /></button>
        <h2 className="text-2xl font-black mb-1">🎨 CONFIGURAÇÕES <span className="text-accent">VISUAIS</span></h2>
        <p className="text-xs text-muted-foreground mb-4">Edição visual simples, página por página</p>

        <div className="flex flex-wrap gap-2 mb-5">
          {PAGINAS.map((p) => (
            <button
              key={p.valor}
              onClick={() => setPaginaAtiva(p.valor)}
              className={`px-3 h-8 rounded-lg text-xs font-semibold ${paginaAtiva === p.valor ? "bg-accent text-white" : "bg-white/5 border border-white/10"}`}
            >
              {p.nome}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-accent flex items-center gap-1.5 mb-1"><Palette size={13} /> Cor de fundo</label>
            <div className="flex gap-2 items-center">
              <input type="color" value={corFundo || "#0f172a"} onChange={(e) => setCorFundo(e.target.value)} className="w-12 h-9 rounded bg-transparent" />
              <input type="text" value={corFundo} onChange={(e) => setCorFundo(e.target.value)} placeholder="#0f172a"
                className="flex-1 bg-white/5 border border-white/10 rounded-lg h-9 px-3 text-sm" />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-accent flex items-center gap-1.5 mb-1"><Palette size={13} /> Cor dos botões</label>
            <div className="flex gap-2 items-center">
              <input type="color" value={corBotao || "#dc2626"} onChange={(e) => setCorBotao(e.target.value)} className="w-12 h-9 rounded bg-transparent" />
              <input type="text" value={corBotao} onChange={(e) => setCorBotao(e.target.value)} placeholder="#dc2626"
                className="flex-1 bg-white/5 border border-white/10 rounded-lg h-9 px-3 text-sm" />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-accent flex items-center gap-1.5 mb-1"><Type size={13} /> Fonte</label>
            <select value={fonte} onChange={(e) => setFonte(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg h-9 px-3 text-sm">
              <option value="">Padrão (sistema)</option>
              {FONTES.slice(1).map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-accent flex items-center gap-1.5 mb-1"><ImageIcon size={13} /> Imagem ou vídeo de fundo</label>
            {midiaUrl && (
              midiaTipo === "video"
                ? <video src={midiaUrl} className="w-full h-32 object-cover rounded-lg mb-2" muted loop autoPlay />
                : <img src={midiaUrl} className="w-full h-32 object-cover rounded-lg mb-2" alt="Fundo atual" />
            )}
            <label className="flex items-center justify-center gap-2 h-10 rounded-lg border-2 border-dashed border-border cursor-pointer text-sm hover:border-accent transition-colors">
              {enviandoMidia ? "Enviando..." : "Escolher imagem ou vídeo"}
              <input type="file" accept="image/*,video/*" className="hidden"
                onChange={(e) => e.target.files?.[0] && uploadMidia(e.target.files[0])} />
            </label>
          </div>

          {msg && <p className="text-sm">{msg}</p>}

          <button onClick={salvar} disabled={salvando} className="w-full h-11 rounded-lg bg-accent text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60">
            <Save size={15} /> {salvando ? "Salvando..." : `Salvar configuração de "${PAGINAS.find(p => p.valor === paginaAtiva)?.nome}"`}
          </button>
        </div>
      </div>
    </div>
  );
}
