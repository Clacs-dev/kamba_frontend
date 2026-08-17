import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface ItemMenu {
    caminho: string;
    icone: string;
    label: string;
    perfis: string[];
}

const ITENS: ItemMenu[] = [
    { caminho: "/", icone: "◈", label: "Início", perfis: ["colaborador", "director", "capital_humano", "comissao", "administracao"] },
    { caminho: "/portal", icone: "▣", label: "Portal do Colaborador", perfis: ["colaborador", "director", "capital_humano", "comissao", "administracao"] },
    { caminho: "/colaboradores", icone: "☰", label: "Colaboradores", perfis: ["capital_humano", "administracao"] },
    { caminho: "/avaliacoes", icone: "✎", label: "Avaliação", perfis: ["colaborador", "director", "capital_humano", "comissao", "administracao"] },
    { caminho: "/disciplina", icone: "§", label: "Processos Disciplinares", perfis: ["director", "capital_humano", "administracao"] },
    { caminho: "/ausencias", icone: "⧗", label: "Férias & Ausências", perfis: ["colaborador", "director", "capital_humano", "administracao"] },
    { caminho: "/formacao", icone: "▸", label: "Plano de Formação", perfis: ["director", "capital_humano", "administracao"] },
    { caminho: "/cultura", icone: "◉", label: "Cultura", perfis: ["colaborador", "director", "capital_humano", "administracao"] },
    { caminho: "/relatorios", icone: "▤", label: "Relatórios", perfis: ["capital_humano", "administracao"] },
    { caminho: "/dashboard", icone: "◇", label: "Dashboard", perfis: ["capital_humano", "administracao"] },
    { caminho: "/historico", icone: "↗", label: "Histórico (3 anos)", perfis: ["director", "capital_humano", "administracao"] },
    { caminho: "/auditoria", icone: "§", label: "Auditoria", perfis: ["capital_humano", "administracao"] },
    { caminho: "/administracao", icone: "⚙", label: "Administração", perfis: ["capital_humano", "administracao"] },
];

interface SidebarProps {
    aberto: boolean;
    aoFechar: () => void;
}

export default function Sidebar({ aberto, aoFechar }: SidebarProps) {
    const { user } = useAuth();
    const perfil = user?.role || "";
    const visiveis = ITENS.filter((i) => i.perfis.includes(perfil));

    return (
        <>
            {/* Fundo escuro por trás do menu em mobile */}
            {aberto && (
                <div className="fixed inset-0 bg-black/40 z-40 md:hidden" onClick={aoFechar} />
            )}

            <nav
                className={`
          bg-paper border-r border-line py-3 flex-shrink-0
          w-[238px]
          fixed md:sticky md:top-[53px] top-0 left-0 z-50 md:z-auto
          h-screen md:h-[calc(100vh-53px)]
          overflow-y-auto
          transition-transform duration-200
          ${aberto ? "translate-x-0" : "-translate-x-full"} md:translate-x-0
        `}
            >
                <div className="px-4 pb-3 mb-2 border-b border-line">
                    <div className="text-xs tracking-widest uppercase text-dim mb-1">Perfil de acesso</div>
                    <div className="text-sm font-semibold text-pri-dark">{traduzPerfil(perfil)}</div>
                </div>
                {visiveis.map((item) => (
                    <NavLink
                        key={item.caminho}
                        to={item.caminho}
                        end={item.caminho === "/"}
                        onClick={aoFechar}
                        className={({ isActive }) =>
                            `w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-sm border-l-[3px] transition-colors ${isActive
                                ? "text-pri-dark border-pri bg-pri-bg"
                                : "text-dim border-transparent hover:text-strong hover:bg-panel"
                            }`
                        }
                    >
                        <span className="w-4 text-center">{item.icone}</span>
                        <span>{item.label}</span>
                    </NavLink>
                ))}
            </nav>
        </>
    );
}

function traduzPerfil(role: string): string {
    const mapa: Record<string, string> = {
        colaborador: "Colaborador",
        director: "Director",
        capital_humano: "Capital Humano",
        comissao: "Comissão de Avaliação",
        administracao: "Administração",
    };
    return mapa[role] || role;
}