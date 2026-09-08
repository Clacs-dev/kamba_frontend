import type { ReactNode } from "react";

interface ChipProps {
    label: ReactNode;
    sublabel?: ReactNode;
    selecionado?: boolean;
    largo?: boolean; // equivalente a `.chip.sn` (sim/não), min-width maior
    onClick?: () => void;
}

// Chip seleccionável, equivalente a `.chip` do protótipo (usado em escalas 1-5 e sim/não).
export function Chip({ label, sublabel, selecionado, largo, onClick }: ChipProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`flex-1 text-center px-[7px] py-[10px] rounded-[10px] border-[1.5px] transition-colors ${largo ? "min-w-[110px]" : "min-w-[82px]"
                } ${selecionado ? "border-pri bg-pri-bg" : "border-line bg-paper hover:border-pri-soft"
                }`}
        >
            <b className={`block font-serif text-[15px] font-normal ${selecionado ? "text-pri-dark" : "text-dim"}`}>
                {label}
            </b>
            {sublabel && (
                <small className={`block text-[9.8px] mt-0.5 ${selecionado ? "text-pri-dark" : "text-dim"}`}>
                    {sublabel}
                </small>
            )}
        </button>
    );
}

// Contentor flex-wrap, equivalente a `.chips` do protótipo.
export function ChipGroup({ children, className = "" }: { children: ReactNode; className?: string }) {
    return <div className={`flex gap-[7px] flex-wrap ${className}`}>{children}</div>;
}
