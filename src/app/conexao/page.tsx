"use client";

import { useEffect, useState } from "react";
import { Sidebar, TopBar, BellButton } from "@/components/Sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { chamarApi, getSessao } from "@/lib/sessao";
import { ArrowLeft } from "lucide-react";
import { useConfigVisual } from "@/lib/useConfigVisual";

export default function ConexaoPage() {
  const sessao = getSessao();
  const [alertas, setAlertas] = useState<any[]>([]);

  const carregar = () => {
    chamarApi({ acao: "evo_listar_alertas_conexao" }).then((data) => {
      if (data && data.ok) setAlertas(data.alertas || []);
    });
  };
  useEffect(() => { carregar(); }, []);

  const responder = async (linha: number, lado: "requerente" | "requerida") => {
    await chamarApi({ acao: "evo_responder_alerta_conexao", linha, lado, respondente: sessao?.nome });
    carregar();
  };

  const configVisual = useConfigVisual("conexao");

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
          <h1 className="text-3xl md:text-4xl font-black mb-2">Conexão entre Lojas</h1>
          <p className="text-muted-foreground text-sm mb-6">Protocolos de retirada e pedidos de vistoria pendentes</p>

          <div className="space-y-3">
            {alertas.map((a) => (
              <Card key={a.linha} className="border-border">
                <CardContent className="py-4">
                  <p className="font-bold">{a.tipo} — {a.resumo}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.lojaRequerente} → {a.lojaRequerida} · {a.dataHora} · por {a.solicitante}
                  </p>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => responder(a.linha, "requerente")}
                      disabled={a.requerenteConfirmou}
                      className={`h-8 px-3 rounded-lg text-xs font-semibold ${a.requerenteConfirmou ? "bg-green-500/20 text-green-400" : "bg-accent text-white"}`}
                    >
                      {a.requerenteConfirmou ? "✓ Requerente OK" : "Confirmar (Requerente)"}
                    </button>
                    <button
                      onClick={() => responder(a.linha, "requerida")}
                      disabled={a.requeridaConfirmou}
                      className={`h-8 px-3 rounded-lg text-xs font-semibold ${a.requeridaConfirmou ? "bg-green-500/20 text-green-400" : "bg-accent text-white"}`}
                    >
                      {a.requeridaConfirmou ? "✓ Requerida OK" : "Confirmar (Requerida)"}
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {alertas.length === 0 && <p className="text-muted-foreground text-sm">Nenhum alerta pendente. ✅</p>}
          </div>
        </div>
      </div>
    </main>
  );
}
