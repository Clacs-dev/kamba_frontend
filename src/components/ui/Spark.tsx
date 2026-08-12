interface SparkProps {
    valores: (number | null | undefined)[];
    largura?: number;
    altura?: number;
}

// Mini-gráfico de linha (sparkline), porta directa da função `spark()` do protótipo.
export default function Spark({ valores, largura = 260, altura = 56 }: SparkProps) {
    const validos = valores.filter((v): v is number => v != null);
    if (validos.length < 2) {
        return <span className="text-[10.8px] text-dim">histórico insuficiente</span>;
    }

    const min = Math.min(...validos) - 0.3;
    const max = Math.max(...validos) + 0.3;
    const denom = max - min || 1;

    const pontos = valores
        .map((v, i) => {
            if (v == null) return null;
            const x = (i / (valores.length - 1)) * (largura - 16) + 8;
            const y = altura - 8 - ((v - min) / denom) * (altura - 16);
            return [x, y] as const;
        })
        .filter((p): p is readonly [number, number] => p != null);

    const path = pontos.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");

    return (
        <svg className="w-full" style={{ height: altura }} viewBox={`0 0 ${largura} ${altura}`}>
            <path d={path} fill="none" stroke="var(--color-pri)" strokeWidth={2.5} strokeLinecap="round" />
            {pontos.map((p, i) => (
                <circle key={i} cx={p[0]} cy={p[1]} r={3.2} fill="var(--color-paper)" stroke="var(--color-pri)" strokeWidth={2} />
            ))}
        </svg>
    );
}
