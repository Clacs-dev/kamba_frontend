import { useEffect, useState } from "react";
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

// Tipos de documento que constituem políticas/regulamentos (protótipo: aba "Políticas").
const TIPOS_POLITICA = [
    "regulamento_interno",
    "regulamento_avaliacao",
    "politica_remuneracao",
    "politica_assiduidade",
    "codigo_etica",
];

export default function PoliticasTab() {
    const [docs, setDocs] = useState<Documento[]>([]);
    const [aCarregar, setACarregar] = useState(true);
    const [erro, setErro] = useState("");
    const [aberto, setAberto] = useState<DocumentoCompleto | null>(null);

    useEffect(() => {
        api.get("/documents")
            .then((resp) => setDocs(resp.data.filter((d: Documento) => TIPOS_POLITICA.includes(d.doc_type || ""))))
            .catch((err) => setErro(err.response?.data?.detail || "Erro ao carregar as políticas."))
            .finally(() => setACarregar(false));
    }, []);

    const abrir = async (id: number) => {
        try {
            const resp = await api.get(`/documents/${id}`);
            setAberto(resp.data);
        } catch {
            setErro("Não foi possível abrir o documento.");
        }
    };

    if (aCarregar) return <p className="text-dim text-sm">A carregar políticas...</p>;

    return (
        <Cartao>
            <h3 className="text-[14.5px] mb-1">Políticas e regulamentos — leitura registada</h3>
            <p className="text-dim text-[11.5px] mb-3">
                As normas da empresa em texto integral. Ler um documento fica registado — a prova de comunicação exigida em sede disciplinar.
            </p>

            {erro && <p className="text-bad text-sm mb-3">{erro}</p>}

            {docs.length === 0 && (
                <p className="text-dim text-sm py-4 text-center">
                    Ainda não há políticas publicadas.
                </p>
            )}

            {docs.map((doc) => (
                <DocRow
                    key={doc.id}
                    monograma={(doc.doc_type || doc.title).slice(0, 2).toUpperCase()}
                    titulo={doc.title}
                    meta="texto integral"
                    acaoLabel="Ler"
                    aoAcionar={() => abrir(doc.id)}
                />
            ))}

            <Notice className="mt-3">
                Ao abrir um documento, a <b>leitura fica registada</b> com data e hora.
            </Notice>

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
        </Cartao>
    );
}
