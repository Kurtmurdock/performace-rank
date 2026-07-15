"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import { Sidebar, TopBar, BellButton } from "@/components/Sidebar";
import { chamarApi, getSessao } from "@/lib/sessao";
import { ArrowLeft, Upload } from "lucide-react";

type Lead = { id: number; nome: string; telefone: string; regiao: "lagos" | "rio"; selecionado: boolean; enviado: boolean };

function classificarRegiao(telefoneRaw: string): "lagos" | "rio" {
  const digitos = (telefoneRaw || "").toString().replace(/\D/g, "");
  let semDDI = digitos;
  if (digitos.length >= 12 && digitos.startsWith("55")) semDDI = digitos.slice(2);
  const ddd = semDDI.slice(0, 2);
  return ddd === "21" ? "rio" : "lagos";
}

function embaralhar<T>(arr: T[]): T[] {
  const copia = [...arr];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

const TAMANHO_LOTE = 50;

export default function LeadsPage() {
  const sessao = getSessao();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [statusUpload, setStatusUpload] = useState("");
  const [statusDisparo, setStatusDisparo] = useState("");
  const [disparando, setDisparando] = useState(false);

  const processarArquivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    setStatusUpload("Lendo planilha...");
    try {
      const buffer = await arquivo.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const primeiraAba = workbook.Sheets[workbook.SheetNames[0]];
      const linhas: any[] = XLSX.utils.sheet_to_json(primeiraAba, { header: 1, defval: "" });

      let proximoId = 1;
      const novosLeads: Lead[] = [];
      linhas.forEach((linha) => {
        const nome = (linha[3] || "").toString().trim(); // Coluna D
        const telefone = (linha[4] || "").toString().trim(); // Coluna E
        if (!nome || !telefone) return;
        const telefoneLimpo = telefone.replace(/\D/g, "");
        if (telefoneLimpo.length < 10) return;
        novosLeads.push({
          id: proximoId++, nome, telefone: telefoneLimpo,
          regiao: classificarRegiao(telefoneLimpo),
          selecionado: false, enviado: false,
        });
      });
      setLeads(novosLeads);
      setStatusUpload(`✅ ${novosLeads.length} leads carregados.`);
    } catch {
      setStatusUpload("❌ Erro ao ler a planilha.");
    }
    e.target.value = "";
  };

  const toggleSelecao = (id: number, marcado: boolean) => {
    setLeads((ls) => ls.map((l) => (l.id === id ? { ...l, selecionado: marcado } : l)));
  };

  const marcarTodos = (regiao: "lagos" | "rio", marcado: boolean) => {
    setLeads((ls) => ls.map((l) => (l.regiao === regiao && !l.enviado ? { ...l, selecionado: marcado } : l)));
  };

  const disparar = async () => {
    const selecionados = leads.filter((l) => l.selecionado && !l.enviado);
    if (!selecionados.length) return;
    if (!confirm(`Disparar ${selecionados.length} leads selecionados agora? Isso enviará mensagens reais para os grupos do WhatsApp.`)) return;

    setDisparando(true);
    const embaralhados = embaralhar(selecionados);
    let enviadosTotal = 0;
    let falhasTotal: any[] = [];

    for (let i = 0; i < embaralhados.length; i += TAMANHO_LOTE) {
      const lote = embaralhados.slice(i, i + TAMANHO_LOTE);
      setStatusDisparo(`Enviando... (${enviadosTotal}/${embaralhados.length})`);
      const data = await chamarApi({ acao: "evo_disparar_leads", leads: lote });
      if (data && data.ok) {
        const idsLote = new Set(lote.map((l) => l.id));
        setLeads((ls) => ls.map((l) => (idsLote.has(l.id) ? { ...l, enviado: true, selecionado: false } : l)));
        enviadosTotal += data.enviados || lote.length;
        if (data.falhas && data.falhas.length) falhasTotal = falhasTotal.concat(data.falhas);
      } else {
        setStatusDisparo("❌ Erro: " + ((data && data.erro) || "desconhecido"));
        setDisparando(false);
        return;
      }
    }

    if (falhasTotal.length) {
      const primeira = falhasTotal[0];
      setStatusDisparo(`⚠️ ${enviadosTotal} enviados, ${falhasTotal.length} falharam. Ex: ${primeira.nome} — ${primeira.erro}`);
    } else {
      setStatusDisparo(`✅ Concluído (${enviadosTotal} enviados)`);
    }
    setDisparando(false);
  };

  const lagos = leads.filter((l) => l.regiao === "lagos");
  const rio = leads.filter((l) => l.regiao === "rio");
  const totalSelecionados = leads.filter((l) => l.selecionado && !l.enviado).length;

  const Lista = ({ lista }: { lista: Lead[] }) =>
    lista.length === 0 ? (
      <p className="text-xs text-muted-foreground py-2">Nenhum lead aqui.</p>
    ) : (
      <div className="space-y-1 max-h-64 overflow-y-auto">
        {lista.map((l) => (
          <label key={l.id} className={`flex items-center gap-2 text-xs px-2 py-1.5 rounded ${l.enviado ? "opacity-50" : "hover:bg-white/5"}`}>
            <input type="checkbox" checked={l.selecionado} disabled={l.enviado} onChange={(e) => toggleSelecao(l.id, e.target.checked)} />
            <span className="flex-1">{l.enviado ? "✅ " : ""}{l.nome}</span>
            <span className="text-muted-foreground">{l.telefone}</span>
          </label>
        ))}
      </div>
    );

  if (!sessao) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background text-foreground px-4 text-center">
        <p className="text-muted-foreground">Sessão não encontrada. <a href="/login" className="text-accent underline">Fazer login</a></p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground px-4 py-8 md:px-10">
      <BellButton />
      <TopBar />
      <div className="flex flex-col md:flex-row gap-8">
        <Sidebar nomeUsuario={sessao?.nome} />
        <div className="flex-1 max-w-3xl">
          <a href="/" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-accent mb-4"><ArrowLeft size={15} /> Voltar ao Rank</a>
          <h1 className="text-3xl md:text-4xl font-black mb-6">📇 <span className="text-accent">Leads</span></h1>

          <label className="flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-lg py-6 cursor-pointer hover:border-accent transition-colors mb-2">
            <Upload size={16} className="text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Clique pra enviar a planilha de leads (.xlsx)</span>
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={processarArquivo} />
          </label>
          {statusUpload && <p className="text-sm mb-6">{statusUpload}</p>}

          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="font-bold text-sm">Lagos <span className="text-muted-foreground font-normal">({lagos.length} leads)</span></p>
                <label className="flex items-center gap-1.5 text-xs">
                  <input type="checkbox" onChange={(e) => marcarTodos("lagos", e.target.checked)} /> Marcar todos
                </label>
              </div>
              <Lista lista={lagos} />
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="font-bold text-sm">Rio de Janeiro <span className="text-muted-foreground font-normal">({rio.length} leads)</span></p>
                <label className="flex items-center gap-1.5 text-xs">
                  <input type="checkbox" onChange={(e) => marcarTodos("rio", e.target.checked)} /> Marcar todos
                </label>
              </div>
              <Lista lista={rio} />
            </div>
          </div>

          {statusDisparo && <p className="text-sm mb-2">{statusDisparo}</p>}
          <button
            onClick={disparar}
            disabled={totalSelecionados === 0 || disparando}
            className="h-11 px-5 rounded-lg bg-accent text-white font-bold text-sm disabled:opacity-50"
          >
            {disparando ? "Disparando..." : totalSelecionados > 0 ? `🚀 Disparar ${totalSelecionados} lead(s) selecionado(s)` : "🚀 Disparar leads selecionados"}
          </button>
        </div>
      </div>
    </main>
  );
}
