import { useState } from "react";
import Cartao from "../Cartao";
import Tag from "../ui/Tag";
import Paginacao from "../ui/Paginacao";

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
    /** Linhas por página. 0 desliga a paginação. */
    passo?: number;
    /** Mínimo de linhas visíveis por página (completa com linhas vazias). */
    minLinhas?: number;
    /** Mostra a barra de paginação mesmo com uma só página (mapas uniformes). */
    barraSempre?: boolean;
    /** Faz o cartão crescer para igualar a altura do mapa ao lado. */
    crescer?: boolean;
}

const PASSO_PADRAO = 15;

// Tabela de pedidos de férias/faltas, reutilizada nas 3 vistas por perfil
// (colaborador/director/CH). Listas longas paginam 15 linhas por página; os
// mapas lado a lado usam 10 linhas com altura constante.
export default function TabelaAusencias({
    pedidos,
    mostrarColaborador,
    mostrarDocumento,
    acoes,
    vazio,
    passo = PASSO_PADRAO,
    minLinhas = 0,
    barraSempre = false,
    crescer = false,
}: Props) {
    const [pagina, setPagina] = useState(1);

    if (pedidos.length === 0) {
        return (
            <Cartao className={crescer ? "grow" : undefined}>
                <p className="text-dim text-sm text-center py-4">{vazio || "Não há pedidos para mostrar."}</p>
            </Cartao>
        );
    }

    const inicio = passo > 0 ? (pagina - 1) * passo : 0;
    const aMostrar = passo > 0 ? pedidos.slice(inicio, inicio + passo) : pedidos;
    // Com a lista dividida em páginas, cada página mostra minLinhas linhas —
    // o cartão não encolhe quando se passa para a última página.
    const preencher = minLinhas > 0 && pedidos.length > passo && aMostrar.length < minLinhas;
    const linhas: (PedidoAusencia | null)[] = preencher
        ? [...aMostrar, ...Array.from({ length: minLinhas - aMostrar.length }, () => null)]
        : aMostrar;
    const nColunas =
        (mostrarColaborador ? 1 : 0) + 3 + (mostrarDocumento ? 1 : 0) + 1 + (acoes ? 1 : 0);

    return (
        <Cartao className={`p-0 overflow-hidden ${crescer ? "flex flex-col grow" : ""}`}>
            <div className={`overflow-x-auto ${crescer ? "grow" : ""}`}>
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
                        {linhas.map((p, i) => {
                            if (!p) {
                                return (
                                    <tr key={`vazio-${i}`} aria-hidden="true">
                                        <td colSpan={nColunas} className="px-3 py-2.5 border-b border-line2">&nbsp;</td>
                                    </tr>
                                );
                            }
                            const estado = ROTULO_ESTADO[p.status];
                            return (
                                <tr key={p.id} className="hover:bg-panel transition-colors">
                                    {mostrarColaborador && (
                                        <td className="px-3 py-2.5 border-b border-line2 whitespace-nowrap">
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
            <Paginacao
                total={pedidos.length}
                passo={passo}
                pagina={pagina}
                aoMudarPagina={setPagina}
                rotulo="pedidos"
                className="border-t border-line2"
                sempre={barraSempre}
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
