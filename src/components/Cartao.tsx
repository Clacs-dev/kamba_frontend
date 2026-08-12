import type { ReactNode } from "react";

interface CartaoProps {
    children: ReactNode;
    className?: string;
    onClick?: () => void;
}

export default function Cartao({ children, className = "", onClick }: CartaoProps) {
    return (
        <div
            onClick={onClick}
            className={`bg-paper border border-line rounded-xl p-[15px] shadow-[0_1px_4px_rgba(34,50,58,0.04)] ${onClick ? "cursor-pointer hover:border-pri hover:shadow-[0_3px_10px_rgba(67,128,140,0.13)] hover:-translate-y-px transition-all" : ""
                } ${className}`}
        >
            {children}
        </div>
    );
}