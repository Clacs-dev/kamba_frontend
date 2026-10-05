import { useState } from "react";
import Cartao from "../Cartao";
import Tag from "../ui/Tag";
import VerMais from "../ui/VerMais";

export interface PedidoAusencia {
    id: number;
    collaborator_id: number;
    collaborator_name?: string;
    type: "ferias" | "falta" | "maternidade" | "doenca";
    start_date: string;
    end_date: string;
    days: number;
    reason: string;
    status: "pendente_dir" | "pendente_ch" | "aprovada" | "justificada" | "recusada";
    document_name?: string | null;
    document_url?: string | null;
    averbado?: boolean;
}

const ROTULO_TIPO: Record<PedidoAusencia["type"], string> = {
    ferias: "Férias",
    falta: "Falta justificada",
    maternidade: "Licença de maternidade",
    doenca: "Doença prolongada",
};

const ROTULO_ESTADO: Record<PedidoAusencia["status"], { texto: string; variante: "ok" | "warn" | "bad" | "info" }> = {
    pendente_dir: { texto: "aguarda director", variante: "warn" },
    pendente_ch: { texto: "aguarda Capital Humano", variante: "info" },
    aprovada: { texto: "aprovada", variante: "ok" },
    justificada: { texto: "justificada", variante: "ok" },
    recusada: { texto: "recusada", variante: "bad" },
};

/** Período no formato dd.mm.yyyy — omite a data final quando é igual à inicial. */
export function periodoCurto(isoInicio: string, isoFim: string) {
    const d = (iso: string) => {
        const [a, m, dia] = iso.split("-");
        return dia ? `${dia}.${m}.${a}` : "—";
    };
    return isoInicio === isoFim ? d(isoInicio) : `${d(isoInicio)}–${d(isoFim)}`;
}

interface Props {
    pedidos: PedidoAusencia[];
    mostrarColaborador?: boolean;
    mostrarDocumento?: boolean;
    acoes?: (p: PedidoAusencia) => React.ReactNode;
    vazio?: string;
    /** Linhas reveladas de cada vez. 0 desliga a paginação. */
    passo?: number;
}

const PASSO_PADRAO = 10;

// Tabela de pedidos de férias/faltas, reutilizada nas 3 vistas por perfil
// (colaborador/director/CH). Listas longas são reveladas sob pedido, para não
// obrigarem a percorrer dezenas de linhas de uma vez.
export default function TabelaAusencias({
    pedidos,
    mostrarColaborador,
    mostrarDocumento,
    acoes,
    vazio,
    passo = PASSO_PADRAO,
}: Props) {
    const [visiveis, setVisiveis] = useState(passo || pedidos.length);

    if (pedidos.length === 0) {
        return (
            <Cartao>
                <p className="text-dim text-sm text-center py-4">{vazio || "Não há pedidos para mostrar."}</p>
            </Cartao>
        );
    }

    const aMostrar = passo > 0 ? pedidos.slice(0, visiveis) : pedidos;

    return (
        <Cartao className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-[12.8px] min-w-[560px]">
                    <thead>
                        <tr>
                            {mostrarColaborador && <Th>Colaborador</Th>}
                            <Th>Tipo</Th>
                            <Th>Período</Th>
                            <Th>Dias</Th>
                            {mostrarDocumento && <Th>Documento</Th>}
                            <Th>Estado</Th>
                            {acoes && <Th className="text-right">Ações</Th>}
                        </tr>
                    </thead>
                    <tbody>
                        {aMostrar.map((p) => {
                            const estado = ROTULO_ESTADO[p.status];
                            return (
                                <tr key={p.id} className="hover:bg-panel transition-colors">
                                    {mostrarColaborador && (
                                        <td className="px-3 py-2.5 border-b border-line2">
                                            <b className="text-strong">{p.collaborator_name || `#${p.collaborator_id}`}</b>
                                        </td>
                                    )}
                                    <td className="px-3 py-2.5 border-b border-line2 text-ink">
                                        {ROTULO_TIPO[p.type]}
                                    </td>
                                    <td className="px-3 py-2.5 border-b border-line2 text-ink whitespace-nowrap">
                                        {periodoCurto(p.start_date, p.end_date)}
                                    </td>
                                    <td className="px-3 py-2.5 border-b border-line2 text-ink">{p.days}</td>
                                    {mostrarDocumento && (
                                        <td className="px-3 py-2.5 border-b border-line2 text-ink">
                                            {p.document_url ? (
                                                <a
                                                    href={p.document_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-pri font-semibold hover:underline cursor-pointer"
                                                >
                                                    {p.document_name || "Abrir ficheiro"}
                                                </a>
                                            ) : p.document_name ? (
                                                <span className="text-ok">anexado</span>
                                            ) : (
                                                <span className="text-dim">—</span>
                                            )}
                                        </td>
                                    )}
                                    <td className="px-3 py-2.5 border-b border-line2">
                                        <Tag variante={estado.variante}>{estado.texto}</Tag>
                                    </td>
                                    {acoes && (
                                        <td className="px-3 py-2.5 border-b border-line2 text-right whitespace-nowrap">
                                            {acoes(p)}
                                        </td>
                                    )}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            <VerMais
                visiveis={aMostrar.length}
                total={pedidos.length}
                passo={passo}
                aoVerMais={() => setVisiveis((n) => n + passo)}
                aoVerTodos={() => setVisiveis(pedidos.length)}
                rotulo="pedidos"
                className="border-t border-line2"
            />
        </Cartao>
    );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return (
        <th className={`text-left text-[10.3px] uppercase tracking-wide text-dim px-3 py-2.5 border-b border-line ${className}`}>
            {children}
        </th>
    );
}
