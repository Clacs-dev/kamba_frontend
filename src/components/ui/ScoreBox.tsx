import type { ReactNode } from "react";

interface ScoreBoxProps {
    label: string;
    valor: ReactNode;
    children?: ReactNode;
    className?: string;
}

// Painel fixo (sticky) de nota ao vivo, equivalente a `.scorebox` do protótipo.
export default function ScoreBox({ label, valor, children, className = "" }: ScoreBoxProps) {
    return (
        <div className={`sticky top-16 bg-pri-bg border border-pri-soft rounded-xl p-[14px] ${className}`}>
            <div className="text-[10.5px] text-dim uppercase tracking-wide">{label}</div>
            <div className="font-serif text-[30px] font-semibold text-pri-dark">{valor}</div>
            {children}
        </div>
    );
}
