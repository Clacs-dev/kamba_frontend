import Cartao from "./Cartao";

interface Kpi {
    valor: string | number;
    label: string;
    cor?: "normal" | "ok" | "warn" | "bad";
}

export default function FaixaKpis({ kpis }: { kpis: Kpi[] }) {
    const corValor = (cor?: string) => {
        if (cor === "ok") return "text-ok";
        if (cor === "warn") return "text-warn";
        if (cor === "bad") return "text-bad";
        return "text-pri-dark";
    };

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-5">
            {kpis.map((k, i) => (
                <Cartao key={i}>
                    <div className={`font-serif font-semibold text-[26px] ${corValor(k.cor)}`}>{k.valor}</div>
                    <div className="text-[10.5px] text-dim uppercase tracking-wide mt-0.5 leading-tight">{k.label}</div>
                </Cartao>
            ))}
        </div>
    );
}