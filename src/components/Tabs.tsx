interface TabsProps {
    tabs: { chave: string; label: string }[];
    ativo: string;
    aoSelecionar: (chave: string) => void;
}

export default function Tabs({ tabs, ativo, aoSelecionar }: TabsProps) {
    return (
        <div className="flex gap-1 flex-wrap border-b border-line mb-3.5">
            {tabs.map((t) => (
                <button
                    key={t.chave}
                    onClick={() => aoSelecionar(t.chave)}
                    className={`px-3.5 py-2 text-[12.3px] border-b-2 transition-colors ${ativo === t.chave
                            ? "text-pri-dark border-pri font-semibold"
                            : "text-dim border-transparent hover:text-strong"
                        }`}
                >
                    {t.label}
                </button>
            ))}
        </div>
    );
}