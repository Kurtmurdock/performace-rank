"use client";

import { useEffect, useState } from "react";
import { Sidebar, TopBar, BellButton } from "@/components/Sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { RainbowButton } from "@/components/ui/rainbow-button";
import { getSessao, chamarApi } from "@/lib/sessao";
import { Camera, Lock, Check } from "lucide-react";

type Perfil = {
  nome: string; email: string; telefone: string; cargo: string; loja: string;
  fotoPerfilUrl: string; temDocumento: boolean; temComprovante: boolean;
};

export default function PerfilPage() {
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [msgSenha, setMsgSenha] = useState("");
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const [msgFoto, setMsgFoto] = useState("");

  const sessao = getSessao();

  useEffect(() => {
    if (!sessao) return;
    chamarApi({ acao: "rh_perfil_obter", nome: sessao.nome }).then((data) => {
      if (data && data.ok) setPerfil(data.perfil);
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

  return (
    <main className="min-h-screen bg-background text-foreground px-4 py-8 md:px-10">
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
                <CardContent className="py-5 flex items-center justify-around text-sm">
                  <div className="flex items-center gap-2">
                    <Check size={16} className={perfil.temDocumento ? "text-green-500" : "text-muted-foreground"} />
                    Documento pessoal
                  </div>
                  <div className="flex items-center gap-2">
                    <Check size={16} className={perfil.temComprovante ? "text-green-500" : "text-muted-foreground"} />
                    Comprovante de residência
                  </div>
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
                      className="w-full bg-white/5 border border-white/10 focus:border-accent rounded-lg h-10 px-3 text-sm outline-none"
                    />
                    <input
                      type="password"
                      placeholder="Nova senha"
                      value={novaSenha}
                      onChange={(e) => setNovaSenha(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 focus:border-accent rounded-lg h-10 px-3 text-sm outline-none"
                    />
                    {msgSenha && <p className="text-xs">{msgSenha}</p>}
                    <RainbowButton onClick={trocarSenha} className="w-full mt-2">
                      Salvar nova senha
                    </RainbowButton>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
