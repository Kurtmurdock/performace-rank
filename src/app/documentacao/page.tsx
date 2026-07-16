"use client";

import { useEffect, useState } from "react";
import { Sidebar, TopBar, BellButton } from "@/components/Sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { chamarApi, getSessao } from "@/lib/sessao";
import { ArrowLeft } from "lucide-react";
import { useConfigVisual } from "@/lib/useConfigVisual";

export default function DocumentacaoPage() {
  const sessao = getSessao();
  const [vendas, setVendas] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    chamarApi({ acao: "rh_listar_estoque_mobile" }).then((data) => {
      if (data && data.ok) setVendas((data.motos || []).filter((m: any) => m.status.includes("Vendido")));
      setCarregando(false);
    });
  }, []);

  const configVisual = useConfigVisual("documentacao");

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
        <Sidebar nomeUsuario={sessao?.nome} />
        <div className="flex-1">
          <a href="/" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-accent mb-4"><ArrowLeft size={15} /> Voltar ao Rank</a>
          <h1 className="text-3xl md:text-4xl font-black mb-2">Documentação</h1>
          <p className="text-muted-foreground text-sm mb-6">Vendas recentes — acompanhamento de documentação pós-venda</p>

          {carregando && <p className="text-muted-foreground">Carregando...</p>}
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {vendas.map((v) => (
              <Card key={v.linha} className="border-border">
                <CardContent className="py-4">
                  <p className="font-bold">{v.marca} {v.modelo}</p>
                  <p className="text-xs text-muted-foreground mb-2">{v.placa || "Sem placa"} · {v.chao}</p>
                  <p className="text-xs bg-white/5 rounded-lg p-2">📄 Olá Sabrina, essa moto foi vendida. Obrigado pelo empenho!</p>
                </CardContent>
              </Card>
            ))}
            {!carregando && vendas.length === 0 && <p className="text-muted-foreground text-sm">Nenhuma venda recente.</p>}
          </div>
        </div>
      </div>
    </main>
  );
}
