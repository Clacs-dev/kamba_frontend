interface CabecalhoProps {
    eyebrow: string;
    titulo: string;
    descricao?: string;
}

export default function Cabecalho({ eyebrow, titulo, descricao }: CabecalhoProps) {
    return (
        <div className="mb-4">
            <div className="text-[10px] tracking-[0.22em] uppercase text-pri">{eyebrow}</div>
            <h2 className="text-[23px] mt-1">{titulo}</h2>
            {descricao && (
                <p className="text-dim mt-1.5 max-w-[780px] leading-relaxed">{descricao}</p>
            )}
        </div>
    );
}