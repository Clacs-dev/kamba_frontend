import type { ReactNode } from "react";

type VarianteNotice = "default" | "soft" | "alert";

interface NoticeProps {
    children: ReactNode;
    variante?: VarianteNotice;
    className?: string;
}

const CLASSES_VARIANTE: Record<VarianteNotice, string> = {
    default: "border-pri-soft bg-pri-bg [&_b]:text-pri-dark",
    soft: "border-ok bg-ok-bg [&_b]:text-ok",
    alert: "border-bad bg-bad-bg [&_b]:text-bad",
};

// Caixa de aviso/contexto, equivalente a `.notice` do protótipo.
export default function Notice({ children, variante = "default", className = "" }: NoticeProps) {
    return (
        <div
            className={`border-l-[3px] rounded-r-lg px-[13px] py-[10px] text-[12.3px] leading-[1.55] my-[11px] ${CLASSES_VARIANTE[variante]} ${className}`}
        >
            {children}
        </div>
    );
}
