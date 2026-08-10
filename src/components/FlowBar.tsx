// A barra visual das fases, ao estilo do protótipo.
// 'fases' é a lista de nomes; 'atual' é o índice da fase corrente (0-based).
interface FlowBarProps {
    fases: string[];
    atual: number;
}

export default function FlowBar({ fases, atual }: FlowBarProps) {
    return (
        <div className="flex gap-0 overflow-x-auto my-2">
            {fases.map((fase, i) => {
                const concluida = i < atual;
                const agora = i === atual;
                return (
                    <div key={i} className="flex-1 min-w-[105px] text-center relative px-1">
                        {/* Linha de ligação (menos no primeiro) */}
                        {i > 0 && (
                            <div
                                className={`absolute top-3 left-[-50%] w-full h-0.5 z-0 ${concluida || agora ? "bg-pri" : "bg-line"
                                    }`}
                            />
                        )}
                        <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold mx-auto mb-1.5 relative z-10 ${concluida
                                    ? "bg-ok border-2 border-ok text-white"
                                    : agora
                                        ? "bg-pri border-2 border-pri text-white shadow-[0_0_0_4px_var(--color-pri-bg)]"
                                        : "bg-paper border-2 border-line text-dim"
                                }`}
                        >
                            {concluida ? "✓" : i + 1}
                        </div>
                        <div
                            className={`text-[10.3px] leading-tight ${agora ? "text-pri-dark font-semibold" : concluida ? "text-ok" : "text-dim"
                                }`}
                        >
                            {fase}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}