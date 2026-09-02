import { useEffect, useRef, useState } from "react";

interface Props {
    value: string;
    onChange: (v: string) => void;
    options: string[];
    placeholder?: string;
    disabled?: boolean;
    loading?: boolean;
    className?: string;
    onFocus?: () => void;
}

/** Input livre com dropdown de sugestões que filtra conforme se escreve. */
export default function AutocompleteIA({
    value,
    onChange,
    options,
    placeholder,
    disabled,
    loading,
    className = "",
    onFocus,
}: Props) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const aoClicar = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", aoClicar);
        return () => document.removeEventListener("mousedown", aoClicar);
    }, []);

    const q = value.trim().toLowerCase();
    const filtradas = options.filter((o) =>
        q ? o.toLowerCase().includes(q) : true
    );

    // Só mostra a caixa quando há sugestões — nunca fica bloqueado "a carregar".
    const mostrar = open && !disabled && filtradas.length > 0;

    return (
        <div ref={ref} className="relative">
            <input
                value={value}
                onChange={(e) => {
                    onChange(e.target.value);
                    setOpen(true);
                }}
                onFocus={() => {
                    onFocus?.();
                    setOpen(true);
                }}
                onKeyDown={(e) => {
                    if (e.key === "Escape") setOpen(false);
                    if (e.key === "Enter" && filtradas.length === 1 && q) onChange(filtradas[0]);
                }}
                placeholder={placeholder}
                disabled={disabled}
                autoComplete="off"
                className={className}
            />
            {loading && options.length === 0 && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10.5px] text-pri pointer-events-none">
                    a carregar...
                </span>
            )}
            {mostrar && (
                <ul className="absolute z-50 mt-1 w-full max-h-56 overflow-y-auto bg-panel border border-line rounded-lg shadow-xl">
                    {filtradas.map((op) => (
                        <li key={op}>
                            <button
                                type="button"
                                className="w-full text-left px-3 py-2 text-[12.5px] hover:bg-pri hover:text-white transition-colors"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => {
                                    onChange(op);
                                    setOpen(false);
                                }}
                            >
                                {op}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}