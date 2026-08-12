import type { ReactNode } from "react";

// Caixa de assinatura digital, equivalente a `.sig` do protótipo.
export default function SignatureBox({ children, className = "" }: { children: ReactNode; className?: string }) {
    return (
        <div className={`border-[1.5px] border-dashed border-pri-soft rounded-[10px] p-[14px] bg-panel ${className}`}>
            {children}
        </div>
    );
}
