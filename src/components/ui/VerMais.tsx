interface Props {
    /** Quantos elementos já estão a ser mostrados. */
    visiveis: number;
    /** Total de elementos disponíveis. */
    total: number;
    /** Quantos elementos acrescenta cada clique em "ver mais". */
    passo?: number;
    aoVerMais: () => void;
    aoVerTodos: () => void;
    /** Nome do que está a ser revelado, no plural ("colaboradores", "pedidos"...). */
    rotulo?: string;
    className?: string;
}

// Control "mostrar mais" para listas longas (mapas, tabelas). Aparece por baixo
// da tabela e revela o bloco seguinte de nomes, em vez de a tabela crescer sem
// fim. Some quando já está tudo visível.
export default function VerMais({ visiveis, total, passo = 10, aoVerMais, aoVerTodos, rotulo = "elementos", className = "" }: Props) {
    if (total === 0 || visiveis >= total || passo <= 0) return null;
    const proximos = Math.min(passo, total - visiveis);

    return (
        <div className={`flex flex-wrap items-center justify-center gap-2.5 px-[15px] py-3 ${className}`}>
            <span className="text-[11.5px] text-dim">
                A mostrar {visiveis} de {total} {rotulo}
            </span>
            <button
                onClick={aoVerMais}
                className="bg-paper border border-line rounded-lg px-3.5 py-1.5 text-[11.8px] font-semibold text-ink hover:border-pri hover:text-pri transition-colors cursor-pointer"
            >
                Ver mais {proximos}
            </button>
            {total > visiveis + proximos && (
                <button
                    onClick={aoVerTodos}
                    className="text-[11.5px] text-pri font-semibold hover:underline cursor-pointer"
                >
                    Ver todos
                </button>
            )}
        </div>
    );
}
