"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Sidebar, TopBar, BellButton } from "@/components/Sidebar";
import { chamarApi, getSessao } from "@/lib/sessao";
import { ArrowLeft } from "lucide-react";
import { ClienteBusca, type Cliente } from "@/components/ClienteBusca";
import { FormasPagamentoEditor, type FormaPagamento } from "@/components/FormasPagamentoEditor";

const LOJAS = ["Salinas","Atlântica","União Motos","Vision","Maré Motos","Muralha","Império","Confort","PQD Motos","Rio das Ostras","Infinity","Baby Motos"];

type Moto = {
  linha: number; marca: string; modelo: string; placa: string; chassi: string;
  chao: string; status: string;
};

export default function FechamentoVendaPage() {
  const sessao = getSessao();
  const searchParams = useSearchParams();
  const linha = parseInt(searchParams.get("linha") || "", 10);

  const [moto, setMoto] = useState<Moto | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const [lojaVenda, setLojaVenda] = useState("");
  const [vendedores, setVendedores] = useState<string[]>([]);
  const [vendedorNome, setVendedorNome] = useState("");
  const [formasPagamento, setFormasPagamento] = useState<FormaPagamento[]>([]);
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [temAutorizado, setTemAutorizado] = useState(false);
  const [autorizado, setAutorizado] = useState<Cliente | null>(null);

  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!linha) { setErro("Linha da moto não informada na URL."); setCarregando(false); return; }
    chamarApi({ acao: "rh_obter_moto", linha }).then((data) => {
      if (data && data.ok) {
        setMoto(data.moto);
        setLojaVenda(data.moto.chao || "");
      } else {
        setErro((data && data.erro) || "Moto não encontrada.");
      }
      setCarregando(false);
    });
  }, [linha]);

  useEffect(() => {
    if (!lojaVenda) return;
    chamarApi({ acao: "rh_listar_vendedores_loja", loja: lojaVenda }).then((data) => {
      if (data && data.ok) setVendedores(data.vendedores || []);
    });
  }, [lojaVenda]);

  const finalizar = async () => {
    setMsg("");
    if (!lojaVenda || !vendedorNome) { setMsg("❌ Selecione a loja e o vendedor."); return; }
    if (formasPagamento.length === 0) { setMsg("❌ Adicione ao menos uma forma de pagamento."); return; }
    if (!cliente) { setMsg("❌ Selecione ou cadastre o cliente."); return; }
    if (temAutorizado && !autorizado) { setMsg("❌ Selecione ou cadastre o autorizado (ou desmarque a retirada por terceiros)."); return; }

    setSalvando(true);
    const data = await chamarApi({
      acao: "rh_editar_moto",
      gerente: sessao?.nome,
      linha,
      campos: {},
      novoStatus: `🏁 Vendido, ${lojaVenda}`,
      fechamentoVenda: {
        vendedorNome,
        formasPagamento,
        cliente,
        autorizado: temAutorizado ? autorizado : null,
      },
    });
    if (data && data.ok) {
      setMsg("✅ Venda finalizada com sucesso!");
      setTimeout(() => { window.location.href = "/estoque"; }, 1000);
    } else {
      setMsg("❌ " + ((data && data.erro) || "Erro ao finalizar a venda."));
    }
    setSalvando(false);
  };

  return (
    <main className="min-h-screen bg-background text-foreground px-4 py-8 md:px-10">
      <BellButton />
      <TopBar />
      <div className="flex flex-col md:flex-row gap-8">
        <Sidebar nomeUsuario={sessao?.nome} />
        <div className="flex-1 max-w-2xl">
          <a href="/estoque" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-accent mb-4">
            <ArrowLeft size={15} /> Voltar ao Estoque
          </a>
          <h1 className="text-3xl md:text-4xl font-black mb-1">Fechamento de <span className="text-accent">Venda</span></h1>

          {carregando && <p className="text-muted-foreground text-sm">Carregando...</p>}
          {erro && <p className="text-accent text-sm">❌ {erro}</p>}

          {moto && (
            <div className="space-y-5 mt-4">
              <div className="bg-card border border-border rounded-xl p-4">
                <p className="font-bold">{moto.marca} {moto.modelo}</p>
                <p className="text-xs text-muted-foreground">{moto.placa || "Sem placa"} · CÓD: {moto.linha}</p>
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Loja da Venda</label>
                <select value={lojaVenda} onChange={(e) => setLojaVenda(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg h-10 px-3 text-sm mt-1">
                  <option value="">—</option>
                  {LOJAS.map((l) => <option key={l}>{l}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Vendedor</label>
                <select value={vendedorNome} onChange={(e) => setVendedorNome(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg h-10 px-3 text-sm mt-1">
                  <option value="">{vendedores.length ? "—" : "Selecione a loja primeiro"}</option>
                  {vendedores.map((v) => <option key={v}>{v}</option>)}
                </select>
              </div>

              <div className="bg-accent/10 border border-accent/30 rounded-lg p-4 space-y-3">
                <ClienteBusca label="👤 Cliente" value={cliente} onChange={setCliente} />

                <label className="flex items-center gap-2 text-sm pt-2 border-t border-white/10 mt-2">
                  <input type="checkbox" checked={temAutorizado} onChange={(e) => setTemAutorizado(e.target.checked)} />
                  🔑 Haverá retirada por terceiros? (autorização/procuração)
                </label>

                {temAutorizado && (
                  <ClienteBusca label="👤 Autorizado (retirada por terceiros)" value={autorizado} onChange={setAutorizado} />
                )}
              </div>

              <div>
                <p className="text-sm font-bold text-accent mb-2">💳 Formas de Pagamento</p>
                <FormasPagamentoEditor value={formasPagamento} onChange={setFormasPagamento} />
              </div>

              {msg && <p className="text-sm">{msg}</p>}

              <button
                onClick={finalizar}
                disabled={salvando}
                className="w-full h-11 rounded-lg bg-accent text-white font-bold text-sm disabled:opacity-60"
              >
                {salvando ? "Finalizando..." : "🏁 FINALIZAR VENDA"}
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
