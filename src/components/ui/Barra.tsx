type VarianteBarra = "pri" | "ok" | "warn" | "bad";

interface BarraProps {
    valor: number; // 0-100
    variante?: VarianteBarra;
    className?: string;
}

const CLASSES_FILL: Record<VarianteBarra, string> = {
    pri: "bg-pri-soft",
    ok: "bg-ok",
    warn: "bg-warn",
    bad: "bg-bad",
};

// Barra de progresso, equivalente a `.bar`/`.bar i` do protótipo.
export default function Barra({ valor, variante = "pri", className = "" }: BarraProps) {
    const pct = Math.max(0, Math.min(100, valor));
    return (
        <div className={`h-[7px] bg-line2 rounded-full overflow-hidden mt-[5px] ${className}`}>
            <div
                className={`block h-full rounded-full transition-[width] duration-[400ms] ${CLASSES_FILL[variante]}`}
                style={{ width: `${pct}%` }}
            />
        </div>
    );
}
