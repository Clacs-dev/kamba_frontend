import type { ReactNode } from "react";

interface ModalProps {
    aberto: boolean;
    aoFechar: () => void;
    titulo: string;
    subtitulo?: string;
    children: ReactNode;
}

export default function Modal({ aberto, aoFechar, titulo, subtitulo, children }: ModalProps) {
    if (!aberto) return null;
    return (
        <div
            className="fixed inset-0 bg-black/40 flex items-start justify-center z-[100] p-3 sm:p-8 overflow-y-auto"
            onClick={(e) => { if (e.target === e.currentTarget) aoFechar(); }}
        >
            <div className="bg-paper rounded-[14px] max-w-[760px] w-full px-4 py-4 sm:px-[30px] sm:py-[26px] shadow-2xl my-4">
                <h3 className="text-[17px] mb-1">{titulo}</h3>
                {subtitulo && <div className="text-[11px] text-dim mb-3.5">{subtitulo}</div>}
                {children}
            </div>
        </div>
    );
}