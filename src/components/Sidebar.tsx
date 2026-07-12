"use client";

import { Bell, Radio, Wallet, Megaphone, Link2, Users, ClipboardList, Share2, FileText, Contact, Calendar } from "lucide-react";
import { RainbowButton } from "@/components/ui/rainbow-button";

const ITENS = [
  { label: "Ver Estoque ao Vivo", icon: Radio, href: "/estoque" },
  { label: "Painel Financeiro", icon: Wallet, href: "/financeiro" },
  { label: "Monitor de Anúncios", icon: Megaphone, href: "/anuncios" },
  { label: "Recicla Lead", icon: Link2, href: "/recicla-lead" },
  { label: "RH / Gerência", icon: Users, href: "/rh" },
  { label: "Rotinas", icon: ClipboardList, href: "/rotinas" },
  { label: "Conexão", icon: Share2, href: "/conexao" },
  { label: "Documentação", icon: FileText, href: "/documentacao" },
  { label: "Leads", icon: Contact, href: "/leads" },
  { label: "Eventos", icon: Calendar, href: "/eventos" },
];

export function Sidebar({ nomeUsuario = "Alan Lima" }: { nomeUsuario?: string }) {
  return (
    <aside className="w-full md:w-64 shrink-0 flex md:flex-col gap-2 md:gap-2 overflow-x-auto md:overflow-visible pb-2 md:pb-0">
      {/* Perfil */}
      <a href="/perfil" className="hidden md:flex flex-col items-center gap-2 mb-4 fade-slide-up">
        <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center text-lg font-bold border-2 border-accent">
          {nomeUsuario.split(" ").map((p) => p[0]).slice(0, 2).join("")}
        </div>
        <span className="text-sm font-semibold text-center">{nomeUsuario}</span>
      </a>

      {ITENS.map((item, i) => {
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
    <button className="fixed top-6 right-6 z-40 w-11 h-11 rounded-full bg-card border border-border shadow-lg flex items-center justify-center hover:border-accent transition-colors">
      <Bell size={18} />
      <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-accent text-[10px] flex items-center justify-center font-bold">
        !
      </span>
    </button>
  );
}
