"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import { Sidebar, TopBar, BellButton } from "@/components/Sidebar";
import { chamarApi, getSessao } from "@/lib/sessao";
import { ArrowLeft, Upload } from "lucide-react";

type Lead = { id: number; nome: string; telefone: string; regiao: "rio" | "lagos" };
const DDDS_RIO = ["21", "22", "24"];

export default function LeadsPage() {
  const sessao = getSessao();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selecionados, setSelecionados] = useState<Set<number>>(new Set());
  const [status, setStatus] = useState("");
  const [disparando, setDisparando] = useState(false);

  const processarArquivo = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = e.target?.result;
      const wb = XLSX.read(data, { type: "binary" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const linhas: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      const novosLeads: Lead[] = [];
      linhas.forEach((row, i) => {
        if (i === 0) return; // pula cabeçalho
        const nome = (row[0] || "").toString().trim();
        const telefoneRaw = (row[1] || "").toString().replace(/\D/g, "");
        if (!nome || !telefoneRaw) return;
        const tel = telefoneRaw.length <= 11 ? "55" + telefoneRaw : telefoneRaw;
        const ddd = telefoneRaw.length <= 11 ? telefoneRaw.slice(0, 2) : telefoneRaw.slice(2, 4);
        novosLeads.push({ id: i, nome, telefone: tel, regiao: DDDS_RIO.includes(ddd) ? "rio" : "lagos" });
      });
      setLeads(novosLeads);
      setSelecionados(new Set(novosLeads.map((l) => l.id)));
      setStatus(`✅ ${novosLeads.length} leads carregados.`);
    };
    reader.readAsBinaryString(file);
  };

  const alternarTodos = (regiao: "rio" | "lagos", marcar: boolean) => {
    setSelecionados((prev) => {
      const novo = new Set(prev);
      leads.filter((l) => l.regiao === regiao).forEach((l) => (marcar ? novo.add(l.id) : novo.delete(l.id)));
      return novo;
    });
  };

  const disparar = async () => {
    const escolhidos = leads.filter((l) => selecionados.has(l.id));
    if (!escolhidos.length) return;
    setDisparando(true);
    let enviados = 0;
    const TAMANHO_LOTE = 50;
    for (let i = 0; i < escolhidos.length; i += TAMANHO_LOTE) {
      const lote = escolhidos.slice(i, i + TAMANHO_LOTE);
      setStatus(`Enviando... (${enviados}/${escolhidos.length})`);
      const data = await chamarApi({ acao: "evo_disparar_leads", leads: lote });
      if (data && data.ok) enviados += data.enviados || lote.length;
      else { setStatus("❌ " + ((data && data.erro) || "Erro no disparo.")); setDisparando(false); return; }
    }
    setStatus(`✅ Concluído (${enviados} enviados)`);
    setDisparando(false);
  };

  const lagos = leads.filter((l) => l.regiao === "lagos");
  const rio = leads.filter((l) => l.regiao === "rio");

  return (
    <main className="min-h-screen bg-background text-foreground px-4 py-8 md:px-10">
      <BellButton />
      <TopBar />
      <div className="flex flex-col md:flex-row gap-8">
        <Sidebar nomeUsuario={sessao?.nome} />
        <div className="flex-1 max-w-3xl">
          <a href="/" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-accent mb-4"><ArrowLeft size={15} /> Voltar ao Rank</a>
          <h1 className="text-3xl md:text-4xl font-black mb-2">Leads</h1>
          <p className="text-muted-foreground text-sm mb-6">Upload de planilha — roteamento automático por DDD (21/22/24 = Rio, outros = Lagos)</p>

          <label className="flex items-center justify-center gap-2 h-12 rounded-lg bg-accent text-white font-bold text-sm cursor-pointer mb-3">
            <Upload size={16} /> Selecionar planilha (.xlsx ou .csv)
            <input type="file" accept=".xlsx,.csv" className="hidden" onChange={(e) => e.target.files?.[0] && processarArquivo(e.target.files[0])} />
          </label>
          {status && <p className="text-sm mb-4">{status}</p>}

          {leads.length > 0 && (
            <>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-card border border-border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-bold">Lagos ({lagos.length})</p>
                    <label className="text-xs flex items-center gap-1">
                      <input type="checkbox" onChange={(e) => alternarTodos("lagos", e.target.checked)} defaultChecked /> Marcar todos
                    </label>
                  </div>
                  <div className="max-h-64 overflow-y-auto space-y-1">
                    {lagos.map((l) => (
                      <label key={l.id} className="flex items-center justify-between text-xs py-1">
                        <span className="flex items-center gap-1.5">
                          <input type="checkbox" checked={selecionados.has(l.id)}
                            onChange={(e) => setSelecionados((prev) => { const n = new Set(prev); e.target.checked ? n.add(l.id) : n.delete(l.id); return n; })} />
                          {l.nome}
                        </span>
                        <span className="text-muted-foreground">{l.telefone}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="bg-card border border-border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-bold">Rio de Janeiro ({rio.length})</p>
                    <label className="text-xs flex items-center gap-1">
                      <input type="checkbox" onChange={(e) => alternarTodos("rio", e.target.checked)} defaultChecked /> Marcar todos
                    </label>
                  </div>
                  <div className="max-h-64 overflow-y-auto space-y-1">
                    {rio.map((l) => (
                      <label key={l.id} className="flex items-center justify-between text-xs py-1">
                        <span className="flex items-center gap-1.5">
                          <input type="checkbox" checked={selecionados.has(l.id)}
                            onChange={(e) => setSelecionados((prev) => { const n = new Set(prev); e.target.checked ? n.add(l.id) : n.delete(l.id); return n; })} />
                          {l.nome}
                        </span>
                        <span className="text-muted-foreground">{l.telefone}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <button onClick={disparar} disabled={disparando} className="w-full h-12 rounded-lg bg-accent text-white font-bold disabled:opacity-60">
                🚀 Disparar {selecionados.size} lead(s) selecionado(s)
              </button>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
