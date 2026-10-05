import { useEffect } from "react";

interface Props {
    /** Total de elementos disponíveis. */
    total: number;
    /** Quantos elementos por página. */
    passo?: number;
    /** Página actual (1-based). */
    pagina: number;
    aoMudarPagina: (pagina: number) => void;
    /** Nome do que está a ser paginado, no plural ("colaboradores", "pedidos"...). */
    rotulo?: string;
    className?: string;
}

const PASSO_PADRAO = 15;

// Paginação dos mapas e tabelas longas: 15 registos por página, com
// "anterior"/"próximo" e os números de todas as páginas. Ao voltar atrás mantém
// a página onde se estava.
export default function Paginacao({
    total,
    passo = PASSO_PADRAO,
    pagina,
    aoMudarPagina,
    rotulo = "elementos",
    className = "",
}: Props) {
    const totalPaginas = Math.max(1, Math.ceil(total / passo));

    // Se a lista encolhe (filtro/ano), volta para uma página válida.
    useEffect(() => {
        if (pagina > totalPaginas) aoMudarPagina(totalPaginas);
    }, [pagina, totalPaginas, aoMudarPagina]);

    if (total <= passo) return null;

    const primeiro = (pagina - 1) * passo + 1;
    const ultimo = Math.min(pagina * passo, total);
    const paginas: number[] = [];
    for (let i = 1; i <= totalPaginas; i++) paginas.push(i);

    return (
        <div className={`flex flex-wrap items-center justify-between gap-2 px-[15px] py-3 ${className}`}>
            <span className="text-[11.5px] text-dim order-2 md:order-1 w-full md:w-auto text-center md:text-left">
                {primeiro}–{ultimo} de {total} {rotulo}
            </span>

            <div className="flex items-center gap-1 order-1 md:order-2">
                <Botao onClick={() => aoMudarPagina(pagina - 1)} disabled={pagina <= 1}>
                    Anterior
                </Botao>
                {paginas.map((p) => (
                    <Botao key={p} onClick={() => aoMudarPagina(p)} activo={p === pagina}>
                        {p}
                    </Botao>
                ))}
                <Botao onClick={() => aoMudarPagina(pagina + 1)} disabled={pagina >= totalPaginas}>
                    Próximo
                </Botao>
            </div>
        </div>
    );
}

function Botao({
    children,
    onClick,
    disabled,
    activo,
}: {
    children: React.ReactNode;
    onClick: () => void;
    disabled?: boolean;
    activo?: boolean;
}) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            aria-current={activo ? "page" : undefined}
            className={
                "min-w-[30px] h-[28px] px-2 rounded-lg text-[11.8px] font-semibold border transition-colors cursor-pointer "
                + (activo
                    ? "bg-pri text-white border-pri"
                    : disabled
                      ? "bg-paper text-dim border-line cursor-not-allowed"
                      : "bg-paper text-ink border-line hover:border-pri hover:text-pri")
            }
        >
            {children}
        </button>
    );
}