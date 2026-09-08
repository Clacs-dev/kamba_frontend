import type { ReactNode } from "react";

// Contentor de linha temporal, equivalente a `.tl` do protótipo.
export function Timeline({ children, className = "" }: { children: ReactNode; className?: string }) {
    return (
        <div className={`relative pl-[26px] ${className}`}>
            <div className="absolute left-2 top-1 bottom-1 w-0.5 bg-line" />
            {children}
        </div>
    );
}

type VarianteTimelineItem = "default" | "hi" | "neg";

interface TimelineItemProps {
    data: ReactNode;
    titulo: ReactNode;
    texto?: ReactNode;
    variante?: VarianteTimelineItem;
}

const COR_DOT: Record<VarianteTimelineItem, string> = {
    default: "border-pri-soft",
    hi: "border-pri",
    neg: "border-bad",
};

// Item da linha temporal, equivalente a `.tl-item` do protótipo (com estados `hi`/`neg`).
export function TimelineItem({ data, titulo, texto, variante = "default" }: TimelineItemProps) {
    return (
        <div className="relative pb-[14px]">
            <div className={`absolute -left-6 top-1 w-3 h-3 rounded-full bg-paper border-[3px] ${COR_DOT[variante]}`} />
            <div className="text-[10.3px] uppercase tracking-[0.06em] text-dim">{data}</div>
            <div className="text-[13.3px] font-semibold text-strong my-0.5">{titulo}</div>
            {texto && <div className="text-[12.3px] leading-[1.5]">{texto}</div>}
        </div>
    );
}
