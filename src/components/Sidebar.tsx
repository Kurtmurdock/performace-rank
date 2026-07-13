"use client";

import { Bell, Radio, Wallet, Megaphone, Link2, Users, ClipboardList, Share2, FileText, Contact, Calendar, LogOut } from "lucide-react";
import { RainbowButton } from "@/components/ui/rainbow-button";
import { getSessao } from "@/lib/sessao";

// permitido: undefined = todos os cargos logados veem o item.
// Quando definido, só os cargos listados veem.
const ITENS = [
  { label: "Ver Estoque ao Vivo", icon: Radio, href: "/estoque", permitido: undefined },
  { label: "Painel Financeiro", icon: Wallet, href: "/financeiro", permitido: undefined },
  { label: "Monitor de Anúncios", icon: Megaphone, href: "/anuncios", permitido: undefined },
  { label: "Recicla Lead", icon: Link2, href: "/recicla-lead", permitido: undefined },
  { label: "RH / Gerência", icon: Users, href: "/rh", permitido: ["gestor", "gerente"] },
  { label: "Rotinas", icon: ClipboardList, href: "/rotinas", permitido: ["gestor"] },
  { label: "Conexão", icon: Share2, href: "/conexao", permitido: ["gestor", "gerente"] },
  { label: "Documentação", icon: FileText, href: "/documentacao", permitido: ["gestor", "gerente"] },
  { label: "Leads", icon: Contact, href: "/leads", permitido: ["gestor"] },
  { label: "Eventos", icon: Calendar, href: "/eventos", permitido: undefined },
] as const;

export function Sidebar({ nomeUsuario, cargo }: { nomeUsuario?: string; cargo?: string }) {
  const sessao = getSessao();
  const nome = nomeUsuario || sessao?.nome || "—";
  const cargoAtual = cargo || sessao?.cargo || "";

  const itensVisiveis = ITENS.filter(
    (item) => !item.permitido || (item.permitido as readonly string[]).includes(cargoAtual)
  );

  const sair = () => {
    // Limpa a sessão diretamente (mesma chave usada em toda a base:
    // "performace_sessao") em vez de assumir uma função helper que pode
    // não existir em lib/sessao.
    try { localStorage.removeItem("performace_sessao"); } catch {}
    window.location.href = "/login";
  };

  return (
    <aside className="w-full md:w-64 shrink-0 flex md:flex-col gap-2 md:gap-2 overflow-x-auto md:overflow-visible pb-2 md:pb-0">
      {/* Perfil */}
      <a href="/perfil" className="hidden md:flex flex-col items-center gap-2 mb-4 fade-slide-up">
        <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center text-lg font-bold border-2 border-accent">
          {nome.split(" ").map((p) => p[0]).slice(0, 2).join("")}
        </div>
        <span className="text-sm font-semibold text-center">{nome}</span>
      </a>

      {itensVisiveis.map((item, i) => {
        const Icon = item.icon;
        return (
          <a
            key={item.label}
            href={item.href}
            className="shrink-0 fade-slide-up"
            style={{ animationDelay: `${i * 0.04}s` }}
          >
            <RainbowButton className="w-full md:w-56 justify-start gap-2 text-sm whitespace-nowrap">
              <Icon size={16} />
              {item.label}
            </RainbowButton>
          </a>
        );
      })}

      <button
        onClick={sair}
        className="shrink-0 w-full md:w-56 h-10 mt-1 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 text-sm font-semibold flex items-center justify-start gap-2 px-4 hover:bg-red-500/20 transition-colors fade-slide-up"
      >
        <LogOut size={16} /> Sair
      </button>
    </aside>
  );
}

export function TopBar({ nomeUsuario = "Alan Lima" }: { nomeUsuario?: string }) {
  return (
    <div className="flex md:hidden items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-xs font-bold border border-accent">
          {nomeUsuario.split(" ").map((p) => p[0]).slice(0, 2).join("")}
        </div>
        <span className="text-sm font-semibold">{nomeUsuario}</span>
      </div>
      <button className="relative w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center">
        <Bell size={16} />
      </button>
    </div>
  );
}

export function BellButton() {
  return (
    <button className="fixed top-14 right-6 z-40 w-11 h-11 rounded-full bg-card border border-border shadow-lg flex items-center justify-center hover:border-accent transition-colors">
      <Bell size={18} />
      <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-accent text-[10px] flex items-center justify-center font-bold">
        !
      </span>
    </button>
  );
}
