import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import api from "../../lib/api";
import Cartao from "../Cartao";
import Modal from "../Modal";
import Notice from "../ui/Notice";
import DocRow from "../ui/DocRow";

interface Documento {
    id: number;
    title: string;
    doc_type?: string | null;
}

interface DocumentoCompleto extends Documento {
    content: string;
}

const TIPOS_DOC = [
    { valor: "contrato", label: "Contrato de trabalho" },
    { valor: "regulamento_interno", label: "Regulamento interno" },
    { valor: "codigo_etica", label: "Código de ética" },
    { valor: "politica_assiduidade", label: "Política de assiduidade" },
    { valor: "politica_remuneracao", label: "Política de remuneração" },
    { valor: "regulamento_avaliacao", label: "Regulamento de avaliação" },
    { valor: "outro", label: "Outro" },
];

export default function DocumentosTab() {
    const { user } = useAuth();
    const [docs, setDocs] = useState<Documento[]>([]);
    const [aCarregar, setACarregar] = useState(true);
    const [erro, setErro] = useState("");
    const [aberto, setAberto] = useState<DocumentoCompleto | null>(null);
    const [modalCriar, setModalCriar] = useState(false);

    const eCH = user?.role === "capital_humano";

    const carregar = () => {
        setACarregar(true);
        api.get("/documents")
            .then((resp) => setDocs(resp.data))
            .catch((err) => setErro(err.response?.data?.detail || "Erro ao carregar documentos."))
            .finally(() => setACarregar(false));
    };

    useEffect(() => { carregar(); }, []);

    const abrir = async (id: number) => {
        try {
            const resp = await api.get(`/documents/${id}`);
            setAberto(resp.data);
        } catch {
            setErro("Não foi possível abrir o documento.");
        }
    };

    if (aCarregar) return <p className="text-dim text-sm">A carregar documentos...</p>;

    return (
        <Cartao>
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-[14.5px]">Documentos do vínculo — texto integral</h3>
                {eCH && (
                    <button
                        onClick={() => setModalCriar(true)}
                        className="bg-pri text-white rounded-lg px-3 py-1.5 text-[11.5px] font-semibold hover:bg-pri-dark transition-colors"
                    >
                        + Publicar documento
                    </button>
                )}
            </div>

            {erro && <p className="text-bad text-sm mb-3">{erro}</p>}

            {docs.length === 0 && (
                <p className="text-dim text-sm py-4 text-center">
                    Ainda não há documentos publicados.{eCH && " Publique o primeiro acima."}
                </p>
            )}

            {docs.map((doc) => (
                <DocRow
                    key={doc.id}
                    monograma={(doc.doc_type || doc.title).slice(0, 2).toUpperCase()}
                    titulo={doc.title}
                    meta="com registo de leitura"
                    acaoLabel="Abrir"
                    aoAcionar={() => abrir(doc.id)}
                />
            ))}

            <Notice className="mt-3">
                Ao abrir um documento, a <b>leitura fica registada</b> — a prova de comunicação das normas exigida em sede disciplinar.
            </Notice>

            {/* Modal de leitura */}
            <Modal
                aberto={aberto !== null}
                aoFechar={() => setAberto(null)}
                titulo={aberto?.title || ""}
                subtitulo="Leitura registada · texto integral"
            >
                <div className="whitespace-pre-wrap text-[12.6px] leading-relaxed text-ink bg-panel border border-line rounded-xl p-5 max-h-[56vh] overflow-y-auto">
                    {aberto?.content}
                </div>
                <div className="flex gap-2.5 mt-3.5">
                    <button onClick={() => setAberto(null)} className="bg-paper border border-line rounded-lg px-4 py-2 text-sm text-ink hover:border-pri hover:text-pri transition-colors">
                        Fechar
                    </button>
                </div>
            </Modal>

            {/* Modal de criação (CH) */}
            {modalCriar && (
                <ModalPublicarDocumento aoFechar={() => setModalCriar(false)} aoCriar={() => { setModalCriar(false); carregar(); }} />
            )}
        </Cartao>
    );
}

function ModalPublicarDocumento({ aoFechar, aoCriar }: { aoFechar: () => void; aoCriar: () => void }) {
    const [title, setTitle] = useState("");
    const [docType, setDocType] = useState("regulamento_interno");
    const [content, setContent] = useState("");
    const [erro, setErro] = useState("");

    const submeter = async () => {
        setErro("");
        try {
            await api.post("/documents", { title, doc_type: docType, content });
            aoCriar();
        } catch (err: any) {
            setErro(err.response?.data?.detail || "Erro ao publicar.");
        }
    };

    return (
        <Modal aberto={true} aoFechar={aoFechar} titulo="Publicar documento" subtitulo="Fica disponível para leitura por todos os colaboradores">
            <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Título</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Regulamento Interno 2026"
                className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-[13px] mb-3 focus:outline-none focus:border-pri" />

            <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Tipo</label>
            <select value={docType} onChange={(e) => setDocType(e.target.value)}
                className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-[13px] mb-3 focus:outline-none focus:border-pri">
                {TIPOS_DOC.map((t) => <option key={t.valor} value={t.valor}>{t.label}</option>)}
            </select>

            <label className="block text-[10.5px] uppercase tracking-wide text-dim mb-1">Conteúdo (texto integral)</label>
            <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={8}
                placeholder="Cole aqui o texto completo do documento…"
                className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-[13px] mb-4 focus:outline-none focus:border-pri" />

            {erro && <p className="text-bad text-sm mb-3">{erro}</p>}
            <div className="flex gap-2.5">
                <button onClick={aoFechar} className="bg-paper border border-line rounded-lg px-4 py-2 text-sm text-ink hover:border-pri hover:text-pri transition-colors">Cancelar</button>
                <button onClick={submeter} disabled={!title || !content}
                    className="bg-pri text-white rounded-lg px-4 py-2 text-[12.3px] font-semibold hover:bg-pri-dark transition-colors disabled:opacity-40">
                    Publicar
                </button>
            </div>
        </Modal>
    );
}