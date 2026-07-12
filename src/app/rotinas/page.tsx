"use client";

import { useEffect, useState } from "react";
import { Sidebar, TopBar, BellButton } from "@/components/Sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { chamarApi, getSessao } from "@/lib/sessao";
import { ArrowLeft } from "lucide-react";

export default function RotinasPage() {
  const sessao = getSessao();
  const [dados, setDados] = useState<any>(null);
  const [erro, setErro] = useState("");
  const [aba, setAba] = useState<"logins" | "status" | "faltas" | "cadastros">("logins");

  useEffect(() => {
    chamarApi({ acao: "rh_rotinas", gerente: sessao?.nome, limite: 100 }).then((data) => {
      if (data && data.ok) setDados(data);
      else setErro((data && data.erro) || "Exclusivo para gestores.");
    });
  }, []);

  return (
    <main className="min-h-screen bg-background text-foreground px-4 py-8 md:px-10">
      <BellButton />
      <TopBar />
      <div className="flex flex-col md:flex-row gap-8">
        <Sidebar nomeUsuario={sessao?.nome} />
        <div className="flex-1">
          <a href="/" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-accent mb-4"><ArrowLeft size={15} /> Voltar ao Rank</a>
          <h1 className="text-3xl md:text-4xl font-black mb-6">Rotinas</h1>

          {erro && <p className="text-accent">❌ {erro}</p>}
          {dados && (
            <>
              <div className="flex gap-2 mb-4">
                {(["logins", "status", "faltas", "cadastros"] as const).map((a) => (
                  <button key={a} onClick={() => setAba(a)}
                    className={`px-4 h-9 rounded-lg text-sm font-semibold capitalize ${aba === a ? "bg-accent text-white" : "bg-card border border-border"}`}>
                    {a}
                  </button>
                ))}
              </div>

              <div className="space-y-2">
                {aba === "logins" && dados.logins.map((l: any, i: number) => (
                  <Card key={i} className="border-border"><CardContent className="py-3 flex justify-between text-sm">
                    <span>{l.nome} · {l.cargo} · {l.loja}</span><span className="text-muted-foreground">{l.data} {l.horario}</span>
                  </CardContent></Card>
                ))}
                {aba === "status" && dados.statusMoto.map((s: any, i: number) => (
                  <Card key={i} className="border-border"><CardContent className="py-3 flex justify-between text-sm">
                    <span>{s.quem} → linha {s.linha}: {s.valor}</span><span className="text-muted-foreground">{s.dataHora}</span>
                  </CardContent></Card>
                ))}
                {aba === "faltas" && dados.faltas.map((f: any, i: number) => (
                  <Card key={i} className="border-border"><CardContent className="py-3 flex justify-between text-sm">
                    <span>{f.vendedor} — {f.faltou}</span><span className="text-muted-foreground">{f.data}</span>
                  </CardContent></Card>
                ))}
                {aba === "cadastros" && dados.novosCadastros.map((c: any, i: number) => (
                  <Card key={i} className="border-border"><CardContent className="py-3 flex justify-between text-sm">
                    <span>{c.nome} · {c.cargo} · {c.loja}</span><span className="text-muted-foreground">{c.cadastradoEm}</span>
                  </CardContent></Card>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
