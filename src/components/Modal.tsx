import type { ReactNode } from "react";

interface ModalProps {
    aberto: boolean;
    aoFechar: () => void;
    titulo: string;
    subtitulo?: string;
    children: ReactNode;
    largura?: string;
}

export default function Modal({ aberto, aoFechar, titulo, subtitulo, children, largura }: ModalProps) {
    if (!aberto) return null;
    return (
        <div
            className="fixed inset-0 z-[100] bg-black/40 overflow-y-auto"
            onClick={(e) => { if (e.target === e.currentTarget) aoFechar(); }}
        >
            <div
                className="min-h-full flex items-start justify-center p-3 sm:p-8"
                onClick={(e) => { if (e.target === e.currentTarget) aoFechar(); }}
            >
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-label={titulo}
                    className={`bg-paper rounded-[14px] ${largura || "max-w-[760px]"} w-full px-4 py-4 sm:px-[30px] sm:py-[26px] shadow-2xl max-h-[calc(100vh-4rem)] overflow-y-auto`}
                >
                    <h3 className="text-[17px] mb-1">{titulo}</h3>
                    {subtitulo && <div className="text-[11px] text-dim mb-3.5">{subtitulo}</div>}
                    {children}
                </div>
            </div>
        </div>
    );
}