import type { ReactNode } from "react";

type VarianteTag = "ok" | "warn" | "bad" | "info" | "pri" | "gold";

interface TagProps {
    children: ReactNode;
    variante?: VarianteTag;
    className?: string;
}

const CLASSES_VARIANTE: Record<VarianteTag, string> = {
    ok: "bg-ok-bg text-ok",
    warn: "bg-warn-bg text-warn",
    bad: "bg-bad-bg text-bad",
    info: "bg-info-bg text-info",
    pri: "bg-pri-bg text-pri-dark",
    gold: "bg-[#F6F0DF] text-gold",
};

export default function Tag({ children, variante = "pri", className = "" }: TagProps) {
    return (
        <span
            className={`inline-block px-[9px] py-[3px] rounded-full text-[10.5px] font-semibold ${CLASSES_VARIANTE[variante]} ${className}`}
        >
            {children}
        </span>
    );
}
