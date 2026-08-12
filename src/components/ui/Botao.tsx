import type { ButtonHTMLAttributes } from "react";

type VarianteBotao = "primaria" | "ghost" | "perigo";

interface BotaoProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variante?: VarianteBotao;
}

const CLASSES_VARIANTE: Record<VarianteBotao, string> = {
    primaria: "bg-pri text-white hover:bg-pri-dark",
    ghost: "bg-paper border border-line text-ink hover:border-pri hover:text-pri",
    perigo: "bg-bad text-white hover:bg-bad",
};

// Botão de acção, equivalente a `button.btn` do protótipo (+ variantes ghost/danger/disabled).
export default function Botao({ variante = "primaria", className = "", disabled, ...rest }: BotaoProps) {
    return (
        <button
            disabled={disabled}
            className={`rounded-lg px-[15px] py-[9px] font-semibold text-[12.3px] transition-colors ${CLASSES_VARIANTE[variante]
                } ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"} ${className}`}
            {...rest}
        />
    );
}
