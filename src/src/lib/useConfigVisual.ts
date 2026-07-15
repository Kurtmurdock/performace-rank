"use client";

import { useEffect, useState } from "react";
import { chamarApi } from "@/lib/sessao";

type ConfigPagina = {
  corFundo?: string;
  midiaFundoUrl?: string;
  midiaFundoTipo?: string;
  corBotao?: string;
  fonte?: string;
};

// Busca a configuração visual salva (cor de fundo, mídia, cor de botão,
// fonte) pra uma página específica. Usado junto com o PainelConfigVisual
// (que salva) — aqui só lê e aplica.
export function useConfigVisual(pagina: string): ConfigPagina | null {
  const [config, setConfig] = useState<ConfigPagina | null>(null);

  useEffect(() => {
    chamarApi({ acao: "config_visual_listar" }).then((data) => {
      if (data && data.ok) {
        setConfig((data.configuracoes || {})[pagina] || null);
      }
    });
  }, [pagina]);

  return config;
}
