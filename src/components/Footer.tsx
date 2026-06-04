import React from "react";
import { Anchor } from "lucide-react";

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="w-full bg-slate-100 border-t border-slate-200/80 py-6 text-center text-xs text-slate-500 mt-auto">
      <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-slate-700 font-medium">
          <Anchor className="h-4 w-4 text-orange-500 animate-pulse" />
          <span className="font-semibold text-slate-800">Wilson Sons – Agendamento Integrado</span>
        </div>
        
        <div className="text-slate-500 text-center sm:text-right">
          <p className="font-display tracking-tight text-slate-600 font-medium">
            © {year} Wilson Sons S.A. Todos os direitos reservados.
          </p>
          <p className="text-[10px] text-orange-600 font-mono mt-1 font-semibold uppercase tracking-wider">
            Projeto desenvolvido para fins educativos na KODIE Academy
          </p>
        </div>
      </div>
    </footer>
  );
}
