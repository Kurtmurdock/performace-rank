"use client";

import { useEffect, useState } from "react";
import { Sidebar, TopBar, BellButton } from "@/components/Sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { RainbowButton } from "@/components/ui/rainbow-button";
import { getSessao, chamarApi } from "@/lib/sessao";
import { Camera, Lock, Check, Wallet, FileText, Home, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button-1";
import { useConfigVisual } from "@/lib/useConfigVisual";

type Perfil = {
  nome: string; email: string; telefone: string; cargo: string; loja: string;
  fotoPerfilUrl: string; temDocumento: boolean; temComprovante: boolean; chavePix: string;
};

export default function PerfilPage() {
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [msgSenha, setMsgSenha] = useState("");
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const [msgFoto, setMsgFoto] = useState("");

  const [chavePix, setChavePix] = useState("");
  const [salvandoPix, setSalvandoPix] = useState(false);
  const [msgPix, setMsgPix] = useState("");

  const [enviandoDocumento, setEnviandoDocumento] = useState(false);
  const [enviandoComprovante, setEnviandoComprovante] = useState(false);
  const [msgDocumento, setMsgDocumento] = useState("");
  const [msgComprovante, setMsgComprovante] = useState("");

  const sessao = getSessao();

  useEffect(() => {
    if (!sessao) return;
    chamarApi({ acao: "rh_perfil_obter", nome: sessao.nome }).then((data) => {
      if (data && data.ok) {
        setPerfil(data.perfil);
        setChavePix(data.perfil.chavePix || "");
      }
      setCarregando(false);
    });
  }, []);

  const trocarSenha = async () => {
    setMsgSenha("");
    if (!senhaAtual || !novaSenha) {
      setMsgSenha("Preencha os dois campos.");
      return;
    }
    const data = await chamarApi({
      acao: "rh_perfil_trocar_senha",
      nome: sessao?.nome,
      senhaAtual,
      novaSenha,
    });
    if (data && data.ok) {
      setMsgSenha("✅ Senha alterada com sucesso!");
      setSenhaAtual("");
      setNovaSenha("");
    } else {
      setMsgSenha("❌ " + ((data && data.erro) || "Erro ao trocar senha."));
    }
  };

  const salvarPix = async () => {
    setSalvandoPix(true);
    setMsgPix("");
    const data = await chamarApi({
      acao: "rh_atualizar_pix",
      nome: sessao?.nome,
      chavePix,
      solicitante: sessao?.nome,
    });
    if (data && data.ok) {
      setMsgPix("✅ Chave PIX salva!");
    } else {
      setMsgPix("❌ " + ((data && data.erro) || "Erro ao salvar chave PIX."));
    }
    setSalvandoPix(false);
  };

  const arquivoParaBase64 = (arquivo: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const leitor = new FileReader();
      leitor.onload = (ev) => resolve((ev.target?.result as string).split(",")[1]);
      leitor.onerror = reject;
      leitor.readAsDataURL(arquivo);
    });

  const uploadDocumento = async (e: React.ChangeEvent<HTMLInputElement>, tipo: "documento" | "comprovante") => {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    const setEnviando = tipo === "documento" ? setEnviandoDocumento : setEnviandoComprovante;
    const setMsg = tipo === "documento" ? setMsgDocumento : setMsgComprovante;
    setEnviando(true);
    setMsg("");
    try {
      const base64 = await arquivoParaBase64(arquivo);
      const data = await chamarApi({
        acao: "rh_perfil_upload_documento",
        nome: sessao?.nome,
        tipo,
        arquivoBase64: base64,
        mimeType: arquivo.type,
      });
      if (data && data.ok) {
        setPerfil((p) =>
          p ? { ...p, ...(tipo === "documento" ? { temDocumento: true } : { temComprovante: true }) } : p
        );
        setMsg("✅ Enviado com sucesso!");
      } else {
        setMsg("❌ " + ((data && data.erro) || "Erro ao enviar."));
      }
    } catch {
      setMsg("❌ Erro ao enviar arquivo.");
    } finally {
      setEnviando(false);
      e.target.value = "";
    }
  };

  const sair = () => {
    try { localStorage.removeItem("performace_sessao"); } catch {}
    window.location.href = "/login";
  };

  const uploadFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    setEnviandoFoto(true);
    setMsgFoto("");
    const leitor = new FileReader();
    leitor.onload = async (ev) => {
      const base64 = (ev.target?.result as string).split(",")[1];
      const data = await chamarApi({
        acao: "rh_perfil_upload_foto",
        nome: sessao?.nome,
        arquivoBase64: base64,
        mimeType: arquivo.type,
      });
      if (data && data.ok) {
        setPerfil((p) => (p ? { ...p, fotoPerfilUrl: data.fotoPerfilUrl } : p));
        setMsgFoto("✅ Foto atualizada!");
      } else {
        setMsgFoto("❌ Erro ao enviar foto.");
      }
      setEnviandoFoto(false);
    };
    leitor.readAsDataURL(arquivo);
  };

  if (!sessao) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <p className="text-muted-foreground">
          Sessão não encontrada. <a href="/login" className="text-accent underline">Fazer login</a>
        </p>
      </main>
    );
  }

  const configVisual = useConfigVisual("perfil");

  return (
    <main
      className="min-h-screen bg-background text-foreground px-4 py-8 md:px-10 relative"
      style={{
        backgroundColor: configVisual?.corFundo || undefined,
        fontFamily: configVisual?.fonte || undefined,
        ["--accent" as any]: configVisual?.corBotao || undefined,
      }}
    >
      {configVisual?.midiaFundoUrl && (
        configVisual.midiaFundoTipo === "video" ? (
          <video src={configVisual.midiaFundoUrl} className="fixed inset-0 w-full h-full object-cover -z-10 opacity-30" autoPlay muted loop />
        ) : (
          <img src={configVisual.midiaFundoUrl} className="fixed inset-0 w-full h-full object-cover -z-10 opacity-30" alt="" />
        )
      )}
      <BellButton />
      <TopBar />
      <div className="flex flex-col md:flex-row gap-8">
        <Sidebar nomeUsuario={sessao.nome} />
        <div className="flex-1 max-w-xl">
          <h1 className="text-3xl md:text-4xl font-black mb-2">Meu Perfil</h1>
          <p className="text-muted-foreground text-sm mb-8">Foto, dados e senha de acesso</p>

          {carregando && <p className="text-muted-foreground">Carregando...</p>}

          {perfil && (
            <div className="space-y-6">
              <Card className="border-border">
                <CardContent className="py-6 flex items-center gap-5">
                  <div className="relative shrink-0">
                    {perfil.fotoPerfilUrl ? (
                      <img
                        src={perfil.fotoPerfilUrl}
                        alt={perfil.nome}
                        className="w-20 h-20 rounded-full object-cover border-2 border-accent"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center text-2xl font-bold border-2 border-accent">
                        {perfil.nome.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                      </div>
                    )}
                    <label className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-accent flex items-center justify-center cursor-pointer">
                      <Camera size={14} />
                      <input type="file" accept="image/*" className="hidden" onChange={uploadFoto} />
                    </label>
                  </div>
                  <div>
                    <p className="font-bold text-lg">{perfil.nome}</p>
                    <p className="text-sm text-muted-foreground capitalize">{perfil.cargo} · {perfil.loja || "—"}</p>
                    <p className="text-sm text-muted-foreground">{perfil.telefone || "—"}</p>
                    {msgFoto && <p className="text-xs mt-1">{enviandoFoto ? "Enviando..." : msgFoto}</p>}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardContent className="py-5 space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Check size={16} className={perfil.temDocumento ? "text-green-500" : "text-muted-foreground"} />
                      Documento pessoal
                    </div>
                    <label>
                      <Button
                        size="small"
                        variant="secondary"
                        loading={enviandoDocumento}
                        icon={<FileText size={13} />}
                        onClick={(e) => {
                          e.preventDefault();
                          (e.currentTarget.nextElementSibling as HTMLInputElement)?.click();
                        }}
                      >
                        {perfil.temDocumento ? "Reenviar" : "Enviar"}
                      </Button>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        className="hidden"
                        onChange={(e) => uploadDocumento(e, "documento")}
                      />
                    </label>
                  </div>
                  {msgDocumento && <p className="text-xs">{msgDocumento}</p>}

                  <div className="flex items-center justify-between gap-3 pt-2 border-t border-border">
                    <div className="flex items-center gap-2">
                      <Check size={16} className={perfil.temComprovante ? "text-green-500" : "text-muted-foreground"} />
                      Comprovante de residência
                    </div>
                    <label>
                      <Button
                        size="small"
                        variant="secondary"
                        loading={enviandoComprovante}
                        icon={<Home size={13} />}
                        onClick={(e) => {
                          e.preventDefault();
                          (e.currentTarget.nextElementSibling as HTMLInputElement)?.click();
                        }}
                      >
                        {perfil.temComprovante ? "Reenviar" : "Enviar"}
                      </Button>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        className="hidden"
                        onChange={(e) => uploadDocumento(e, "comprovante")}
                      />
                    </label>
                  </div>
                  {msgComprovante && <p className="text-xs">{msgComprovante}</p>}
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardContent className="py-6">
                  <p className="font-semibold mb-3 flex items-center gap-2"><Wallet size={16} /> Chave PIX</p>
                  <input
                    type="text"
                    placeholder="CPF, e-mail, telefone ou chave aleatória"
                    value={chavePix}
                    onChange={(e) => setChavePix(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 focus:border-accent rounded-lg h-10 px-3 text-sm outline-none"
                  />
                  {msgPix && <p className="text-xs mt-2">{msgPix}</p>}
                  <Button loading={salvandoPix} onClick={salvarPix} fullWidth className="mt-2">
                    Salvar chave PIX
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardContent className="py-6">
                  <p className="font-semibold mb-3 flex items-center gap-2"><Lock size={16} /> Trocar senha</p>
                  <div className="space-y-2">
                    <input
                      type="password"
                      placeholder="Senha atual"
                      value={senhaAtual}
                      onChange={(e) => setSenhaAtual(e.target.value)}
                      autoComplete="current-password"
                      name="performace-perfil-senha-atual"
                      className="w-full bg-white/5 border border-white/10 focus:border-accent rounded-lg h-10 px-3 text-sm outline-none"
                    />
                    <input
                      type="password"
                      placeholder="Nova senha"
                      value={novaSenha}
                      onChange={(e) => setNovaSenha(e.target.value)}
                      autoComplete="new-password"
                      name="performace-perfil-senha-nova"
                      className="w-full bg-white/5 border border-white/10 focus:border-accent rounded-lg h-10 px-3 text-sm outline-none"
                    />
                    {msgSenha && <p className="text-xs">{msgSenha}</p>}
                    <RainbowButton onClick={trocarSenha} className="w-full mt-2">
                      Salvar nova senha
                    </RainbowButton>
                  </div>
                </CardContent>
              </Card>

              <Button variant="secondary" fullWidth onClick={sair} className="!bg-red-500/10 !border-red-500/30 !text-red-400 hover:!bg-red-500/20" icon={<LogOut size={15} />}>
                Sair
              </Button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
