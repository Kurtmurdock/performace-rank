"use client";

import { useEffect, useState } from "react";
import { chamarApi } from "@/lib/sessao";

export type ConfigPagina = {
  pagina: string;
  corFundo?: string;
  midiaFundoUrl?: string;
  midiaFundoTipo?: "imagem" | "video" | "";
  corBotao?: string;
  fonte?: string;
};

/** Busca a configuração visual salva pra uma página específica e devolve
 * pronta pra aplicar via style inline. Se não houver nada salvo, devolve
 * null e a página usa o visual padrão normalmente. */
export function useConfigVisual(pagina: string) {
  const [config, setConfig] = useState<ConfigPagina | null>(null);

  useEffect(() => {
    chamarApi({ acao: "config_visual_listar" }).then((data) => {
      if (data && data.ok && data.configuracoes && data.configuracoes[pagina]) {
        setConfig(data.configuracoes[pagina]);
      }
    });
  }, [pagina]);

  return config;
}
