"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";
import { SpaceBackground } from "@/components/ui/space-background";
import { useConfigVisual } from "@/lib/useConfigVisual";

const API_URL =
  "https://script.google.com/macros/s/AKfycbzRPeZO6kTKnnKD6KOtsBG3YuRbKMLUO9m0Nc4rUTb0ECG_UsW_qiwgzp1hc2q6meBUvQ/exec";

export default function LoginPage() {
  const [nome, setNome] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [focado, setFocado] = useState<string | null>(null);

  const entrar = async () => {
    if (!nome.trim() || !senha.trim()) {
      setErro("Preencha nome e senha.");
      return;
    }
    setCarregando(true);
    setErro("");
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ acao: "rh_login", nome, senha }),
      });
      const data = await res.json();
      if (data && data.ok) {
        localStorage.setItem("performace_sessao", JSON.stringify(data));
        window.location.href = "/";
      } else {
        setErro((data && data.erro) || "Nome ou senha incorretos.");
      }
    } catch {
      setErro("Erro de conexão. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  };

  const configVisual = useConfigVisual("login");

  return (
    <div
      className="min-h-screen w-screen bg-black relative overflow-hidden flex items-center justify-center"
      style={{
        backgroundColor: configVisual?.corFundo || undefined,
        fontFamily: configVisual?.fonte || undefined,
        ["--accent" as any]: configVisual?.corBotao || undefined,
      }}
    >
      <SpaceBackground />
      {configVisual?.midiaFundoUrl && (
        configVisual.midiaFundoTipo === "video" ? (
          <video src={configVisual.midiaFundoUrl} className="absolute inset-0 w-full h-full object-cover opacity-30 z-0" autoPlay muted loop />
        ) : (
          <img src={configVisual.midiaFundoUrl} className="absolute inset-0 w-full h-full object-cover opacity-30 z-0" alt="" />
        )
      )}

      {/* Véu escuro pra garantir contraste do card sobre o fundo 3D */}
      <div className="absolute inset-0 z-[1] bg-gradient-to-b from-black/30 via-black/50 to-black/80" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="w-full max-w-sm relative z-10"
      >
        <div className="relative group">
          {/* Brilho da borda (parado no lugar do efeito de luz percorrendo, mais leve) */}
          <div className="absolute -inset-[1px] rounded-2xl opacity-40 group-hover:opacity-70 transition-opacity duration-700 bg-gradient-to-r from-accent/40 via-white/10 to-accent/40" />

          <div className="relative bg-card/60 backdrop-blur-xl rounded-2xl p-6 border border-white/10 shadow-2xl overflow-hidden">
            <div className="text-center space-y-1 mb-6">
              <div className="mx-auto w-12 h-12 rounded-full border border-white/10 flex items-center justify-center bg-accent/20">
                <span className="text-xl font-black text-accent">P</span>
              </div>
              <h1 className="text-2xl font-bold">PERFORMACE</h1>
              <p className="text-muted-foreground text-xs">Entre com seu login do Rank de Vendas</p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                entrar();
              }}
              autoComplete="off"
              className="space-y-3"
            >
              {/* Nome */}
              <div className="relative">
                <User
                  size={16}
                  className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${
                    focado === "nome" ? "text-accent" : "text-muted-foreground"
                  }`}
                />
                <input
                  type="text"
                  placeholder="Seu nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  onFocus={() => setFocado("nome")}
                  onBlur={() => setFocado(null)}
                  autoComplete="off"
                  name="performace-login-nome"
                  className="w-full bg-white/5 border border-white/10 focus:border-accent rounded-lg h-11 pl-10 pr-3 text-sm outline-none transition-colors"
                />
              </div>

              {/* Senha */}
              <div className="relative">
                <Lock
                  size={16}
                  className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${
                    focado === "senha" ? "text-accent" : "text-muted-foreground"
                  }`}
                />
                <input
                  type={mostrarSenha ? "text" : "password"}
                  placeholder="Sua senha"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  onFocus={() => setFocado("senha")}
                  onBlur={() => setFocado(null)}
                  autoComplete="new-password"
                  name="performace-login-senha"
                  className="w-full bg-white/5 border border-white/10 focus:border-accent rounded-lg h-11 pl-10 pr-10 text-sm outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha(!mostrarSenha)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {mostrarSenha ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>
              </div>

              <AnimatePresence>
                {erro && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-accent text-xs"
                  >
                    {erro}
                  </motion.p>
                )}
              </AnimatePresence>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={carregando}
                className="w-full h-11 rounded-lg bg-accent text-white font-semibold text-sm flex items-center justify-center gap-2 mt-2 disabled:opacity-60"
              >
                {carregando ? (
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Entrar
                    <ArrowRight size={14} />
                  </>
                )}
              </motion.button>
            </form>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
