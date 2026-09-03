import type { ReactNode } from "react";

interface CabecalhoProps {
    eyebrow: string;
    titulo: string;
    descricao?: string;
    acao?: ReactNode;
}

export default function Cabecalho({ eyebrow, titulo, descricao, acao }: CabecalhoProps) {
    return (
        <div className="mb-4">
            <div className="text-[10px] tracking-[0.22em] uppercase text-pri">{eyebrow}</div>
            <h2 className="text-[23px] mt-1">{titulo}</h2>
            {(descricao || acao) && (
                <div className="mt-1.5 flex items-start justify-between gap-3">
                    {descricao && (
                        <p className="text-dim max-w-[780px] leading-relaxed">{descricao}</p>
                    )}
                    {acao && <div className="flex-shrink-0">{acao}</div>}
                </div>
            )}
        </div>
    );
}
