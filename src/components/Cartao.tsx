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
            className={`bg-paper border border-line rounded-xl p-4 shadow-sm ${onClick ? "cursor-pointer hover:border-pri hover:shadow-md transition-all" : ""
                } ${className}`}
        >
            {children}
        </div>
    );
}