interface DocRowProps {
    monograma: string;
    titulo: string;
    meta?: string;
    acaoLabel?: string;
    aoAcionar?: () => void;
}

// Linha de documento, equivalente a `.doc` do protótipo.
export default function DocRow({ monograma, titulo, meta, acaoLabel, aoAcionar }: DocRowProps) {
    return (
        <div className="flex items-center gap-3 px-3 py-[9px] border border-line rounded-[10px] mb-[7px] bg-paper">
            <div className="w-8 h-8 rounded-lg bg-pri-bg text-pri-dark flex items-center justify-center text-[11px] font-semibold flex-shrink-0">
                {monograma}
            </div>
            <div className="flex-1 min-w-0">
                <b className="block text-[12.8px] font-semibold text-strong truncate">{titulo}</b>
                {meta && <span className="block text-[10.8px] text-dim truncate">{meta}</span>}
            </div>
            {acaoLabel && (
                <button
                    type="button"
                    onClick={aoAcionar}
                    className="text-[11.5px] font-semibold text-pri hover:underline flex-shrink-0"
                >
                    {acaoLabel}
                </button>
            )}
        </div>
    );
}
