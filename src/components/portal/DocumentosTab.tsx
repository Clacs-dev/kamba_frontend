import { useEffect, useState } from "react";
import api from "../../lib/api";
import Cartao from "../Cartao";
import Notice from "../ui/Notice";

interface DocItem {
    id: string;
    filename: string;
    tipo: string;
    file_url?: string | null;
    data?: string | null;
    origem: "pessoal" | "ausencia";
}

const ROTULO_PESSOAL: Record<string, string> = {
    bi: "Bilhete de Identidade",
    contrato_assinado: "Contrato assinado",
    certificado_habilitacoes: "Certificado de habilitações",
    outro: "Outro documento",
};

const ROTULO_AUSENCIA: Record<string, string> = {
    ferias: "Comprovativo de férias",
    falta: "Justificação de falta",
    maternidade: "Documento de maternidade",
};

export default function DocumentosTab() {
    const [docs, setDocs] = useState<DocItem[]>([]);
    const [aCarregar, setACarregar] = useState(true);
    const [erro, setErro] = useState("");

    useEffect(() => {
        Promise.all([
            api.get("/collaborators/me/documents").then((r) => r.data).catch(() => []),
            api.get("/leave/requests").then((r) => r.data).catch(() => []),
        ]).then(([pessoais, pedidos]) => {
            const lista: DocItem[] = [];

            for (const d of pessoais) {
                lista.push({
                    id: `p${d.id}`,
                    filename: d.filename,
                    tipo: ROTULO_PESSOAL[d.doc_type || "outro"] || d.doc_type || "Documento",
                    file_url: d.file_url,
                    data: d.uploaded_at,
                    origem: "pessoal",
                });
            }

            for (const p of pedidos) {
                if (p.document_name || p.document_url) {
                    lista.push({
                        id: `a${p.id}`,
                        filename: p.document_name || "Documento anexado",
                        tipo: ROTULO_AUSENCIA[p.type] || "Documento de ausência",
                        file_url: p.document_url,
                        data: p.start_date,
                        origem: "ausencia",
                    });
                }
            }

            setDocs(lista);
        }).catch((e: any) => {
            setErro(e.response?.data?.detail || "Erro ao carregar documentos.");
        }).finally(() => setACarregar(false));
    }, []);

    if (aCarregar) return <p className="text-dim text-sm">A carregar documentos...</p>;

    return (
        <Cartao>
            <h3 className="text-[14.5px] mb-1">Os meus documentos</h3>
            <p className="text-dim text-[11.5px] mb-4">
                Todos os seus documentos: os do vínculo (BI, contrato) e os que anexou a pedidos de férias e faltas.
            </p>

            {erro && <p className="text-bad text-sm mb-3">{erro}</p>}

            {docs.length === 0 ? (
                <p className="text-dim text-sm py-4 text-center">
                    Ainda não há documentos.
                </p>
            ) : (
                <div className="space-y-2">
                    {docs.map((doc) => (
                        <div key={doc.id} className="flex items-center gap-3 px-3 py-2.5 border border-line rounded-xl bg-paper">
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-[13px] font-semibold flex-shrink-0 ${doc.origem === "ausencia" ? "bg-warn-bg text-warn" : "bg-pri-bg text-pri-dark"}`}>
                                {doc.filename.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                                <b className="block text-[12.8px] text-strong truncate">{doc.filename}</b>
                                <span className="text-[10.8px] text-dim">
                                    {doc.tipo}
                                    {doc.data ? " · " + new Date(doc.data).toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" }) : ""}
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
                Estes são os seus documentos pessoais e comprovativos. As normas e políticas da empresa estão na aba <b>Políticas</b>.
            </Notice>
        </Cartao>
    );
}