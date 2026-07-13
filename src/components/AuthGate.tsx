"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { getSessao } from "@/lib/sessao";

// Rotas que NÃO exigem sessão (evita loop infinito de redirecionamento).
const ROTAS_PUBLICAS = ["/login"];

// Guard de autenticação centralizado — aplicado uma única vez no
// layout.tsx, envolvendo {children}. Isso garante que TODA página
// interna do site (não importa qual seja a primeira acessada, ex: um
// link de convite de evento) force login antes de mostrar qualquer
// dado, igual ao site antigo que trava tudo atrás da tela de login.
// Sem isso, cada página teria que reimplementar essa checagem sozinha
// — e bastaria esquecer uma pra abrir uma falha de segurança.
export function AuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [verificando, setVerificando] = useState(true);
  const [autorizado, setAutorizado] = useState(false);

  useEffect(() => {
    const ehPublica = ROTAS_PUBLICAS.some((r) => pathname?.startsWith(r));
    if (ehPublica) {
      setAutorizado(true);
      setVerificando(false);
      return;
    }
    const sessao = getSessao();
    if (sessao) {
      setAutorizado(true);
      setVerificando(false);
    } else {
      // Sem sessão: redireciona pro login, carregando a página de
      // origem em ?returnTo pra poder voltar pra cá depois de logar
      // (o /login precisa ler esse parâmetro pra isso funcionar de
      // ponta a ponta — confirmar se já está implementado lá).
      const destino = "/login?returnTo=" + encodeURIComponent(pathname || "/");
      window.location.href = destino;
      // Não desliga "verificando" — a tela de espera fica até o
      // redirecionamento do navegador realmente acontecer.
    }
  }, [pathname]);

  if (verificando && !autorizado) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <p className="text-muted-foreground text-sm">Verificando sessão...</p>
      </div>
    );
  }

  return <>{children}</>;
}
