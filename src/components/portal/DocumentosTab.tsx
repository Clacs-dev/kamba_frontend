import { useEffect, useState } from "react";
import api from "../../lib/api";
import Cartao from "../Cartao";
import Notice from "../ui/Notice";

interface DocumentoPessoal {
    id: number;
    filename: string;
    doc_type?: string | null;
    file_url?: string | null;
    uploaded_at: string;
}

const ROTULO_TIPO: Record<string, string> = {
    bi: "Bilhete de Identidade",
    contrato_assinado: "Contrato assinado",
    certificado_habilitacoes: "Certificado de habilitações",
    outro: "Outro documento",
};

export default function DocumentosTab() {
    const [docs, setDocs] = useState<DocumentoPessoal[]>([]);
    const [aCarregar, setACarregar] = useState(true);
    const [erro, setErro] = useState("");

    useEffect(() => {
        api.get("/collaborators/me/documents")
            .then((resp) => setDocs(resp.data))
            .catch((err) => setErro(err.response?.data?.detail || "Erro ao carregar documentos."))
            .finally(() => setACarregar(false));
    }, []);

    if (aCarregar) return <p className="text-dim text-sm">A carregar documentos...</p>;

    return (
        <Cartao>
            <h3 className="text-[14.5px] mb-1">Os meus documentos</h3>
            <p className="text-dim text-[11.5px] mb-4">
                Os documentos do seu vínculo carregados pelo Capital Humano (BI, contrato, certificados). Clique para abrir.
            </p>

            {erro && <p className="text-bad text-sm mb-3">{erro}</p>}

            {docs.length === 0 ? (
                <p className="text-dim text-sm py-4 text-center">
                    Ainda não há documentos carregados para si.
                </p>
            ) : (
                <div className="space-y-2">
                    {docs.map((doc) => (
                        <div key={doc.id} className="flex items-center gap-3 px-3 py-2.5 border border-line rounded-xl bg-paper">
                            <div className="w-9 h-9 rounded-lg bg-pri-bg text-pri-dark flex items-center justify-center text-[13px] font-semibold flex-shrink-0">
                                {(doc.doc_type || doc.filename).slice(0, 2).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                                <b className="block text-[12.8px] text-strong truncate">{doc.filename}</b>
                                <span className="text-[10.8px] text-dim">
                                    {ROTULO_TIPO[doc.doc_type || "outro"] || doc.doc_type}
                                    {" · "}
                                    {new Date(doc.uploaded_at).toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" })}
                                </span>
                            </div>
                            {doc.file_url ? (
                                <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="text-[11.5px] text-pri font-semibold hover:underline whitespace-nowrap">
                                    Abrir
                                </a>
                            ) : (
                                <span className="text-[10.8px] text-dim whitespace-nowrap">sem ficheiro</span>
                            )}
                        </div>
                    ))}
                </div>
            )}

            <Notice className="mt-3">
                Estes são os seus documentos pessoais. As normas e políticas da empresa estão na aba <b>Políticas</b>.
            </Notice>
        </Cartao>
    );
}