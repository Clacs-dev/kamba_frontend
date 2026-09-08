import type { ReactNode } from "react";

// Envolve uma tabela para permitir scroll horizontal em ecrãs pequenos,
// mantendo tudo acessível sem cortar colunas.
export default function TabelaScroll({ children }: { children: ReactNode }) {
    return <div className="overflow-x-auto -mx-px">{children}</div>;
}