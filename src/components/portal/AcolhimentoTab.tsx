import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import api from "../../lib/api";
import Cartao from "../Cartao";
import Notice from "../ui/Notice";
import Botao from "../ui/Botao";
import Modal from "../Modal";

interface ItemAcolhimento {
    id: number;
    collaborator_id: number;
    description: string;
    done: boolean;
}

interface Assinatura {
    id: number;
    signature_type: string;
    signed_at: string;
}

interface Documento {
    id: number;
    title: string;
    doc_type?: string | null;
}

interface DocumentoCompleto extends Documento {
    content: string;
}

// As três declarações do manual (secção 2.2), cada uma ligada aos documentos
// publicados pelo CH que o colaborador deve ler antes de aceitar.
const DECLARACOES = [
    {
        tipo: "regulamento_politicas",
        texto: "Li o Regulamento Interno de Trabalho",
        docTypes: ["regulamento_interno"],
    },
    {
        tipo: "termos_portal",
        texto: "Li o Código de Ética e as políticas em vigor",
        docTypes: ["codigo_etica", "politica_assiduidade", "politica_remuneracao", "regulamento_avaliacao"],
    },
    {
        tipo: "consentimento_dados",
        texto: "Li e consinto nos Termos de Utilização do Portal e no tratamento de dados pessoais (Lei n.º 22/11)",
        docTypes: [],
    },
];

export default function AcolhimentoTab() {
    const { user } = useAuth();
    const [itens, setItens] = useState<ItemAcolhimento[]>([]);
    const [assinaturas, setAssinaturas] = useState<Assinatura[]>([]);
    const [documentos, setDocumentos] = useState<Documento[]>([]);
    const [aCarregar, setACarregar] = useState(true);
    const [msg, setMsg] = useState("");
    const [docAberto, setDocAberto] = useState<DocumentoCompleto | null>(null);

    // Estado dos checkboxes e da assinatura.
    const [marcados, setMarcados] = useState<Record<string, boolean>>({});
    const [nomeAssinatura, setNomeAssinatura] = useState("");
    const [aAssinar, setAAssinar] = useState(false);

    const carregar = () => {
        if (!user?.id) return;
        Promise.all([
            api.get(`/onboarding/${user.id}`).then((r) => setItens(r.data)).catch(() => setItens([])),
            api.get("/me/signatures").then((r) => setAssinaturas(r.data)).catch(() => setAssinaturas([])),
            api.get("/documents").then((r) => setDocumentos(r.data)).catch(() => setDocumentos([])),
        ]).finally(() => setACarregar(false));
    };

    useEffect(() => { carregar(); }, [user?.id]);
    useEffect(() => { if (user?.full_name) setNomeAssinatura(user.full_name); }, [user?.full_name]);

    const jaAssinou = (tipo: string) => assinaturas.some((a) => a.signature_type === tipo);
    const todasAssinadas = DECLARACOES.every((d) => jaAssinou(d.tipo));

    const docsDe = (docTypes: string[]) =>
        documentos.filter((d) => d.doc_type && docTypes.includes(d.doc_type));

    const abrirDoc = async (id: number) => {
        try {
            const resp = await api.get(`/documents/${id}`);
            setDocAberto(resp.data);
        } catch {
            setMsg("Não foi possível abrir o documento.");
        }
    };

    // Marca os três como lidos e regista as três assinaturas de uma vez.
    const assinarTudo = async () => {
        setMsg("");
        setAAssinar(true);
        try {
            const porAssinar = DECLARACOES.filter((d) => !jaAssinou(d.tipo));
            for (const d of porAssinar) {
                await api.post("/me/signatures", { signature_type: d.tipo });
            }
            setMsg("Assinaturas registadas com sucesso.");
            carregar();
        } catch (err: any) {
            setMsg(err.response?.data?.detail || "Erro ao registar a assinatura.");
        } finally {
            setAAssinar(false);
        }
    };

    const concluidos = itens.filter((i) => i.done).length;
    const nomeConfere = nomeAssinatura.trim().toLowerCase() === (user?.full_name || "").trim().toLowerCase();
    const podeAssinar = DECLARACOES.every((d) => marcados[d.tipo] || jaAssinou(d.tipo)) && nomeConfere && !todasAssinadas;

    return (
        <div>
            {msg && <Notice variante="soft" className="mb-4">{msg}</Notice>}

            {/* Duas colunas: checklist à esquerda, assinaturas à direita */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Coluna esquerda — checklist */}
                <Cartao>
                    <h3 className="text-[14.5px] mb-1">Bem-vindo(a) — o seu primeiro dia</h3>
                    <p className="text-dim text-[11.5px] mb-4">
                        Lista de acolhimento — o que deve receber e concluir. O Capital Humano marca cada item.
                    </p>
                    {aCarregar ? (
                        <p className="text-dim text-sm">A carregar...</p>
                    ) : itens.length === 0 ? (
                        <p className="text-dim text-sm py-3 text-center">Ainda não há itens de acolhimento definidos.</p>
                    ) : (
                        <>
                            <div className="text-[11.5px] text-dim mb-3">{concluidos} de {itens.length} concluídos</div>
                            <div className="space-y-2">
                                {itens.map((item) => (
                                    <div key={item.id} className="flex items-center justify-between gap-3 px-3 py-2.5 border border-line rounded-lg">
                                        <span className={`text-[12.8px] ${item.done ? "text-strong" : "text-ink"}`}>{item.description}</span>
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold whitespace-nowrap ${item.done ? "bg-ok-bg text-ok" : "bg-warn-bg text-warn"}`}>
                                            {item.done ? "concluído" : "pendente"}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </Cartao>

                {/* Coluna direita — aceitação e assinatura */}
                <Cartao>
                    <h3 className="text-[14.5px] mb-1">Aceitação das regras e consentimento de dados</h3>
                    <p className="text-dim text-[11.5px] mb-4">
                        Leia cada documento e confirme. A assinatura formaliza a adesão.
                    </p>

                    {todasAssinadas ? (
                        <Notice variante="soft">
                            <b className="text-ok">Adesão assinada.</b> As três declarações estão registadas com data e hora.
                        </Notice>
                    ) : (
                        <>
                            <div className="space-y-2.5 mb-4">
                                {DECLARACOES.map((d) => {
                                    const docs = docsDe(d.docTypes);
                                    const assinada = jaAssinou(d.tipo);
                                    return (
                                        <label key={d.tipo} className="flex items-start gap-2.5 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={marcados[d.tipo] || assinada}
                                                disabled={assinada}
                                                onChange={(e) => setMarcados((m) => ({ ...m, [d.tipo]: e.target.checked }))}
                                                className="mt-1 flex-shrink-0"
                                            />
                                            <span className="text-[12.3px] text-ink">
                                                {d.texto}
                                                {docs.map((doc) => (
                                                    <button key={doc.id} type="button" onClick={() => abrirDoc(doc.id)}
                                                        className="text-pri font-semibold hover:underline ml-1.5">
                                                        — ler documento
                                                    </button>
                                                ))}
                                            </span>
                                        </label>
                                    );
                                })}
                            </div>

                            <div className="border border-dashed border-line rounded-xl p-3.5">
                                <label className="block text-[10px] uppercase tracking-wide text-dim mb-1">
                                    Assinatura digital — escreva o seu nome completo
                                </label>
                                <input
                                    value={nomeAssinatura}
                                    onChange={(e) => setNomeAssinatura(e.target.value)}
                                    className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-[13px] mb-2 focus:outline-none focus:border-pri"
                                />
                                <Botao onClick={assinarTudo} disabled={!podeAssinar || aAssinar}>
                                    {aAssinar ? "A assinar..." : "Assinar e aceitar"}
                                </Botao>
                                {!nomeConfere && nomeAssinatura.length > 0 && (
                                    <p className="text-[10.5px] text-warn mt-1.5">O nome deve corresponder ao seu nome completo.</p>
                                )}
                                <p className="text-[10.5px] text-dim mt-2 leading-relaxed">
                                    A assinatura vale como declaração de conhecimento das normas (art.º 23.º do Regulamento Interno) e consentimento nos termos da Lei n.º 22/11.
                                </p>
                            </div>
                        </>
                    )}
                </Cartao>
            </div>

            {/* Modal de leitura */}
            <Modal
                aberto={docAberto !== null}
                aoFechar={() => setDocAberto(null)}
                titulo={docAberto?.title || ""}
                subtitulo="Leitura registada · texto integral"
            >
                <div className="whitespace-pre-wrap text-[12.6px] leading-relaxed text-ink bg-panel border border-line rounded-xl p-5 max-h-[56vh] overflow-y-auto">
                    {docAberto?.content}
                </div>
                <div className="flex gap-2.5 mt-3.5">
                    <button onClick={() => setDocAberto(null)} className="bg-paper border border-line rounded-lg px-4 py-2 text-sm text-ink hover:border-pri hover:text-pri transition-colors">
                        Fechar
                    </button>
                </div>
            </Modal>
        </div>
    );
}