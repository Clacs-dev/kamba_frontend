import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import api from "../../lib/api";
import Cartao from "../Cartao";
import Notice from "../ui/Notice";
import SignatureBox from "../ui/SignatureBox";
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

// As três assinaturas do manual (secção 2.2). Cada uma liga aos tipos de
// documento que o CH publica, para o colaborador ler antes de assinar.
const ASSINATURAS = [
    {
        tipo: "regulamento_politicas",
        label: "Adesão ao Regulamento e Políticas",
        desc: "Declaro que li e aceito o regulamento interno e as políticas da empresa.",
        docTypes: ["regulamento_interno", "codigo_etica", "politica_assiduidade", "politica_remuneracao"],
    },
    {
        tipo: "termos_portal",
        label: "Termos de Utilização do Portal",
        desc: "Aceito os termos de utilização desta plataforma.",
        docTypes: ["regulamento_avaliacao"],
    },
    {
        tipo: "consentimento_dados",
        label: "Consentimento de Dados Pessoais",
        desc: "Consinto o tratamento dos meus dados nos termos da Lei 22/11.",
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

    const carregar = () => {
        if (!user?.id) return;
        Promise.all([
            api.get(`/onboarding/${user.id}`).then((r) => setItens(r.data)).catch(() => setItens([])),
            api.get("/me/signatures").then((r) => setAssinaturas(r.data)).catch(() => setAssinaturas([])),
            api.get("/documents").then((r) => setDocumentos(r.data)).catch(() => setDocumentos([])),
        ]).finally(() => setACarregar(false));
    };

    useEffect(() => { carregar(); }, [user?.id]);

    const jaAssinou = (tipo: string) => assinaturas.some((a) => a.signature_type === tipo);

    // Documentos publicados que correspondem a uma assinatura.
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

    const assinar = async (tipo: string) => {
        setMsg("");
        try {
            await api.post("/me/signatures", { signature_type: tipo });
            setMsg("Assinatura registada com sucesso.");
            carregar();
        } catch (err: any) {
            setMsg(err.response?.data?.detail || "Erro ao registar a assinatura.");
        }
    };

    const concluidos = itens.filter((i) => i.done).length;

    return (
        <div className="space-y-4">
            {msg && <Notice variante="soft">{msg}</Notice>}

            {/* Checklist */}
            <Cartao>
                <h3 className="text-[14.5px] mb-1">Lista de verificação de acolhimento</h3>
                <p className="text-dim text-[11.5px] mb-4">
                    Os passos do seu primeiro dia. O Capital Humano marca cada item à medida que é concluído.
                </p>
                {aCarregar ? (
                    <p className="text-dim text-sm">A carregar...</p>
                ) : itens.length === 0 ? (
                    <p className="text-dim text-sm py-3 text-center">Ainda não há itens de acolhimento definidos para si.</p>
                ) : (
                    <>
                        <div className="text-[11.5px] text-dim mb-3">{concluidos} de {itens.length} concluídos</div>
                        <div className="space-y-2">
                            {itens.map((item) => (
                                <div key={item.id} className="flex items-center gap-3 px-3 py-2.5 border border-line rounded-lg">
                                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] flex-shrink-0 ${item.done ? "bg-ok text-white" : "bg-line2 text-dim"
                                        }`}>
                                        {item.done ? "✓" : ""}
                                    </span>
                                    <span className={`text-[12.8px] ${item.done ? "text-strong" : "text-dim"}`}>{item.description}</span>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </Cartao>

            {/* Assinaturas */}
            <Cartao>
                <h3 className="text-[14.5px] mb-1">Assinaturas de adesão</h3>
                <p className="text-dim text-[11.5px] mb-4">
                    As três declarações que formalizam a sua adesão. Leia os documentos e assine. Cada assinatura fica registada com data e hora.
                </p>
                <div className="space-y-2.5">
                    {ASSINATURAS.map((a) => {
                        const assinada = jaAssinou(a.tipo);
                        const docs = docsDe(a.docTypes);
                        return (
                            <SignatureBox key={a.tipo} className="flex items-start gap-3 !py-3">
                                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] flex-shrink-0 mt-0.5 ${assinada ? "bg-ok text-white" : "bg-line2 text-dim"
                                    }`}>
                                    {assinada ? "✓" : ""}
                                </span>
                                <div className="flex-1">
                                    <div className="text-[13px] font-semibold text-strong">{a.label}</div>
                                    <div className="text-[11.5px] text-dim mt-0.5">{a.desc}</div>
                                    {/* Links para ler os documentos publicados pelo CH */}
                                    {docs.length > 0 && (
                                        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
                                            {docs.map((d) => (
                                                <button key={d.id} onClick={() => abrirDoc(d.id)}
                                                    className="text-[11px] text-pri font-semibold hover:underline">
                                                    ↗ ler {d.title}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                {assinada ? (
                                    <span className="text-[11px] text-ok font-semibold whitespace-nowrap mt-0.5">Assinado</span>
                                ) : (
                                    <Botao onClick={() => assinar(a.tipo)} className="!px-3 !py-1.5 !text-[11.5px] whitespace-nowrap">
                                        Assinar
                                    </Botao>
                                )}
                            </SignatureBox>
                        );
                    })}
                </div>
            </Cartao>

            {/* Modal de leitura do documento */}
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