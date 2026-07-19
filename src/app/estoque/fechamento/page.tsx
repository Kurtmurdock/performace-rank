"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Sidebar, TopBar, BellButton } from "@/components/Sidebar";
import { chamarApi, getSessao } from "@/lib/sessao";
import { ArrowLeft, Lock } from "lucide-react";
import { ClienteBusca, type Cliente } from "@/components/ClienteBusca";
import { FormasPagamentoEditor, type FormaPagamento } from "@/components/FormasPagamentoEditor";

const LOJAS = ["Salinas","Atlântica","União Motos","Vision","Maré Motos","Muralha","Império","Confort","PQD Motos","Rio das Ostras","Infinity","Baby Motos"];
const NOMES_SDR = ["Giovana", "Ana Clara", "Thayna", "Patricia"];

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
  const [travado, setTravado] = useState(false);

  const [lojaVenda, setLojaVenda] = useState("");
  const [vendedores, setVendedores] = useState<string[]>([]);
  const [vendedorNome, setVendedorNome] = useState("");
  const [formasPagamento, setFormasPagamento] = useState<FormaPagamento[]>([]);
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [temSdr, setTemSdr] = useState(false);
  const [sdrNome, setSdrNome] = useState("");
  const [temHalf, setTemHalf] = useState(false);
  const [halfVendedorNome, setHalfVendedorNome] = useState("");
  const [temAutorizado, setTemAutorizado] = useState(false);
  const [autorizado, setAutorizado] = useState<Cliente | null>(null);

  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState("");
  const [contratoFechado, setContratoFechado] = useState(false);

  const [ehCarro, setEhCarro] = useState(false);
  const [docsDisponiveis, setDocsDisponiveis] = useState<{ tipo: string; nome: string }[]>([]);
  const [docsSelecionados, setDocsSelecionados] = useState<string[]>([]);
  const [gerando, setGerando] = useState(false);
  const [docsGerados, setDocsGerados] = useState<{ tipo: string; nome: string; url: string }[]>([]);
  const [pdfUnicoUrl, setPdfUnicoUrl] = useState("");
  const [gerandoTeste, setGerandoTeste] = useState(false);
  const [msgTeste, setMsgTeste] = useState("");
  const [urlTeste, setUrlTeste] = useState("");
  const [msgContratos, setMsgContratos] = useState("");

  useEffect(() => {
    if (!linha) { setErro("Linha da moto não informada na URL."); setCarregando(false); return; }
    // Duas chamadas: rh_obter_moto (dados do veículo) + rh_obter_fechamento
    // (cliente/autorizado/formas de pagamento/SDR/half já salvos, se houver).
    // Sem a segunda, a tela sempre abria em branco mesmo numa venda já
    // fechada, porque nenhum desses dados vinha de volta pro site.
    Promise.all([
      chamarApi({ acao: "rh_obter_moto", linha }),
      chamarApi({ acao: "rh_obter_fechamento", linha }),
    ]).then(([dataMoto, dataFechamento]) => {
      if (dataMoto && dataMoto.ok) {
        setMoto(dataMoto.moto);
        setLojaVenda((dataFechamento && dataFechamento.ok && dataFechamento.lojaVenda) || dataMoto.moto.chao || "");
      } else {
        setErro((dataMoto && dataMoto.erro) || "Moto não encontrada.");
      }

      if (dataFechamento && dataFechamento.ok) {
        setTravado(!!dataFechamento.travado);
        if (dataFechamento.travado) setContratoFechado(true);
        if (dataFechamento.cliente) setCliente(dataFechamento.cliente);
        if (dataFechamento.autorizado) {
          setAutorizado(dataFechamento.autorizado);
          setTemAutorizado(true);
        }
        if (Array.isArray(dataFechamento.formasPagamento) && dataFechamento.formasPagamento.length) {
          setFormasPagamento(dataFechamento.formasPagamento as FormaPagamento[]);
        }
        if (dataFechamento.sdrNome) {
          setSdrNome(dataFechamento.sdrNome);
          setTemSdr(true);
        }
        if (dataFechamento.halfVendedorNome) {
          setHalfVendedorNome(dataFechamento.halfVendedorNome);
          setTemHalf(true);
        }
        if (dataFechamento.vendedorNome) setVendedorNome(dataFechamento.vendedorNome);
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
    if (temHalf && !halfVendedorNome) { setMsg("❌ Selecione o vendedor half (ou desmarque a opção)."); return; }

    setSalvando(true);
    const data = await chamarApi({
      acao: "rh_editar_moto",
      gerente: sessao?.nome,
      linha,
      // Só marca o CONTRATO como "Em Assinatura" — não mexe no Status da
      // Negociação (a moto pode continuar "Em Negociação" no estoque).
      // "Vendido" é uma ação separada, feita pelo vendedor só na entrega
      // física da moto, sem precisar passar por essa tela de novo.
      campos: { statusContrato: "Em Assinatura" },
      fechamentoVenda: {
        vendedorNome,
        formasPagamento,
        cliente,
        autorizado: temAutorizado ? autorizado : null,
        sdrNome: temSdr ? sdrNome : "",
        halfVendedorNome: temHalf ? halfVendedorNome : "",
        loja: lojaVenda,
      },
    });
    if (data && data.ok) {
      setMsg("✅ Contrato fechado com sucesso! A moto continua em negociação até você marcar \"Vendido\" na entrega. Já pode gerar os documentos abaixo.");
      setContratoFechado(true);
      carregarDocsDisponiveis();
      testarContratoUnico(); // dispara o Contrato Único automaticamente, sem precisar clicar em nada
    } else {
      setMsg("❌ " + ((data && data.erro) || "Erro ao fechar o contrato."));
    }
    setSalvando(false);
  };

  const carregarDocsDisponiveis = () => {
    chamarApi({ acao: "rh_documentos_disponiveis", temAutorizado, ehCarro }).then((data) => {
      if (data && data.ok) {
        setDocsDisponiveis(data.documentos);
        setDocsSelecionados(data.documentos.filter((d: any) => d.padrao).map((d: any) => d.tipo));
      }
    });
  };

  const gerarContratos = async () => {
    if (!docsSelecionados.length) { setMsgContratos("❌ Selecione ao menos um documento."); return; }
    setGerando(true);
    setMsgContratos("");
    const data = await chamarApi({ acao: "rh_gerar_contratos", linha, tipos: docsSelecionados });
    if (data && data.ok) {
      setDocsGerados((prev) => [...prev, ...data.gerados]);
      // PDF único: só o dessa rodada de geração, não acumula com rodadas
      // anteriores — por isso substitui em vez de concatenar.
      setPdfUnicoUrl(data.pdfUnicoUrl || "");
      if (data.falhas && data.falhas.length) {
        // Antes só mostrava qual documento falhou, sem dizer o motivo —
        // o erro de verdade ficava só no Logger.log do Apps Script, sem
        // ninguém ver. Agora mostra o motivo direto na tela.
        const detalhes = data.falhas.map((f: any) => {
          const doc = docsDisponiveis.find((d) => d.tipo === f.tipo);
          const nomeExibicao = doc ? doc.nome : f.tipo;
          return `${nomeExibicao}: ${f.erro || "erro desconhecido"}`;
        }).join(" | ");
        setMsgContratos("⚠️ Falha ao gerar: " + detalhes);
      } else {
        setMsgContratos("✅ Documentos gerados com sucesso!");
      }
    } else {
      setMsgContratos("❌ " + ((data && data.erro) || "Erro ao gerar contratos."));
    }
    setGerando(false);
  };

  const testarContratoUnico = async () => {
    setGerandoTeste(true);
    setMsgTeste("");
    const data = await chamarApi({ acao: "rh_gerar_contrato_unico", linha });
    if (data && data.ok) {
      setMsgTeste("✅ Gerado!");
      setUrlTeste(data.url);
    } else {
      setMsgTeste("❌ " + ((data && data.erro) || "Erro ao gerar."));
    }
    setGerandoTeste(false);
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
          <h1 className="text-3xl md:text-4xl font-black mb-1">Fechamento de <span className="text-accent">Contrato</span></h1>
          <p className="text-muted-foreground text-sm mb-4">
            Cliente, pagamento e vendedor ficam registrados aqui. A moto só vira &quot;Vendido&quot; no estoque quando você confirmar a entrega, separadamente.
          </p>

          {carregando && <p className="text-muted-foreground text-sm">Carregando...</p>}
          {erro && <p className="text-accent text-sm">❌ {erro}</p>}

          {moto && (
            <div className="space-y-5 mt-4">
              <div className="bg-card border border-border rounded-xl p-4">
                <p className="font-bold">{moto.marca} {moto.modelo}</p>
                <p className="text-xs text-muted-foreground">{moto.placa || "Sem placa"} · CÓD: {moto.linha}</p>
              </div>

              {travado ? (
                <div className="bg-orange-500/10 border border-orange-400/30 rounded-lg p-4 space-y-2">
                  <p className="text-sm font-bold text-orange-300 flex items-center gap-2">
                    <Lock size={14} /> Venda já fechada — dados travados
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Cliente, pagamento e vendedor não podem mais ser editados por aqui. Qualquer correção
                    precisa ser feita direto na planilha pelo Alan.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Pra ver os dados completos, ou anexar contrato assinado, vídeo declaratório ou
                    comprovante, use o botão <strong>&quot;👁 Ver Dados da Venda&quot;</strong> no card dessa
                    moto na tela de Estoque.
                  </p>
                  <a href="/estoque" className="inline-block text-xs text-accent underline mt-1">← Voltar ao Estoque</a>
                </div>
              ) : (
                <>
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

                  <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                    <label className="text-xs text-muted-foreground">A venda teve participação de SDR?</label>
                    <select value={temSdr ? "sim" : "nao"} onChange={(e) => setTemSdr(e.target.value === "sim")}
                      className="w-full bg-white/5 border border-white/10 rounded-lg h-9 px-2 text-sm mt-1">
                      <option value="nao">Não</option>
                      <option value="sim">Sim</option>
                    </select>
                    {temSdr && (
                      <div className="mt-2">
                        <label className="text-xs text-muted-foreground">Qual SDR?</label>
                        <select value={sdrNome} onChange={(e) => setSdrNome(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-lg h-9 px-2 text-sm mt-1">
                          <option value="">—</option>
                          {NOMES_SDR.map((s) => <option key={s}>{s}</option>)}
                        </select>
                      </div>
                    )}
                  </div>

                  <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                    <label className="text-xs text-muted-foreground">A venda teve "half" (dois vendedores dividindo)?</label>
                    <select value={temHalf ? "sim" : "nao"} onChange={(e) => setTemHalf(e.target.value === "sim")}
                      className="w-full bg-white/5 border border-white/10 rounded-lg h-9 px-2 text-sm mt-1">
                      <option value="nao">Não</option>
                      <option value="sim">Sim</option>
                    </select>
                    {temHalf && (
                      <div className="mt-2">
                        <label className="text-xs text-muted-foreground">Vendedor half (leva metade da comissão)</label>
                        <select value={halfVendedorNome} onChange={(e) => setHalfVendedorNome(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-lg h-9 px-2 text-sm mt-1">
                          <option value="">—</option>
                          {vendedores.filter((v) => v !== vendedorNome).map((v) => <option key={v}>{v}</option>)}
                        </select>
                        <p className="text-[11px] text-muted-foreground mt-1">
                          &quot;{vendedorNome || "—"}&quot; é o cabeça (leva o carimbo da Premiação Semanal). O half só divide a comissão.
                        </p>
                      </div>
                    )}
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

                  {salvando && (
                    <div className="bg-yellow-500/10 border border-yellow-400/30 rounded-lg p-3">
                      <p className="text-sm font-bold text-yellow-300">⏳ Não saia dessa tela!</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Assim que o negócio for salvo, eu libero seus contratos pra download aqui mesmo.
                      </p>
                    </div>
                  )}

                  <button
                    onClick={finalizar}
                    disabled={salvando}
                    className="w-full h-11 rounded-lg bg-accent text-white font-bold text-sm disabled:opacity-60"
                  >
                    {salvando ? "Fechando..." : "📝 FECHAR CONTRATO"}
                  </button>
                </>
              )}

              {contratoFechado ? (
                <div className="border-t border-white/10 pt-5 space-y-3">
                  <p className="text-sm font-bold text-accent">📄 Gerar Contratos</p>

                  <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-3 space-y-2">
                    <p className="text-xs font-bold text-yellow-400">🧪 TESTE — Contrato Único (Moto)</p>
                    <p className="text-[11px] text-muted-foreground">
                      Gera tudo num PDF só (Contrato, Termo, Recibo, Procuração/Autorização ou Termo Simplificado conforme o caso, Checklist). Não afeta o &quot;Gerar Contratos&quot; abaixo.
                    </p>
                    <button
                      onClick={testarContratoUnico}
                      disabled={gerandoTeste}
                      className="w-full h-9 rounded-lg bg-yellow-500/20 border border-yellow-500/40 text-yellow-300 text-xs font-semibold disabled:opacity-60"
                    >
                      {gerandoTeste ? "Gerando..." : "Testar Contrato Único"}
                    </button>
                    {msgTeste && <p className="text-xs">{msgTeste}</p>}
                    {urlTeste && (
                      <a href={urlTeste} target="_blank" rel="noopener" className="block text-xs text-accent underline">
                        📄 Ver Contrato Único gerado
                      </a>
                    )}
                  </div>

                  {docsDisponiveis.length === 0 ? (
                    <button
                      onClick={carregarDocsDisponiveis}
                      className="w-full h-10 rounded-lg bg-white/5 border border-white/10 text-sm font-semibold hover:border-accent"
                    >
                      Ver documentos disponíveis
                    </button>
                  ) : (
                    <>
                      <label className="flex items-center gap-2 text-xs text-muted-foreground">
                        <input type="checkbox" checked={ehCarro} onChange={(e) => { setEhCarro(e.target.checked); }} />
                      Este veículo é um carro (não moto)
                    </label>

                    <div className="grid grid-cols-1 gap-1.5">
                      {docsDisponiveis.map((d) => (
                        <label key={d.tipo} className="flex items-center gap-2 text-sm bg-white/5 rounded-lg px-3 py-2">
                          <input
                            type="checkbox"
                            checked={docsSelecionados.includes(d.tipo)}
                            onChange={(e) => {
                              setDocsSelecionados((prev) =>
                                e.target.checked ? [...prev, d.tipo] : prev.filter((t) => t !== d.tipo)
                              );
                            }}
                          />
                          {d.nome}
                        </label>
                      ))}
                    </div>

                    {msgContratos && <p className="text-sm">{msgContratos}</p>}

                    <button
                      onClick={gerarContratos}
                      disabled={gerando}
                      className="w-full h-10 rounded-lg bg-accent/20 border border-accent/40 text-accent font-bold text-sm disabled:opacity-60"
                    >
                      {gerando ? "Gerando..." : "📄 GERAR DOCUMENTOS SELECIONADOS"}
                    </button>
                  </>
                )}

                {pdfUnicoUrl && (
                  <a
                    href={pdfUnicoUrl} target="_blank" rel="noopener"
                    className="block w-full text-center h-11 leading-[44px] rounded-lg bg-accent text-white font-bold text-sm hover:opacity-90"
                  >
                    📦 Baixar todos os documentos desta venda (PDF único)
                  </a>
                )}

                {docsGerados.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs text-muted-foreground">Documentos gerados (separados):</p>
                    {docsGerados.map((d, i) => (
                      <a key={i} href={d.url} target="_blank" rel="noopener" className="block text-sm text-accent underline">
                        📄 {d.nome}
                      </a>
                    ))}
                  </div>
                )}
                </div>
              ) : (
                <div className="border-t border-white/10 pt-5">
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Lock size={12} /> A geração de documentos libera assim que o contrato for fechado.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
