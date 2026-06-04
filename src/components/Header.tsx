import React, { useState } from "react";
import { Ship, ShieldAlert, FileEdit, LayoutDashboard, Menu, X, ArrowRight } from "lucide-react";

interface HeaderProps {
  currentTab: string;
  setTab: (tab: string) => void;
  securityCleared: boolean;
  onOpenAdminAuth: () => void;
  isAdminAuthenticated?: boolean;
}

export function Header({ currentTab, setTab, securityCleared, onOpenAdminAuth, isAdminAuthenticated }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleTabClick = (tabId: string, secure: boolean) => {
    if (secure && !securityCleared && !isAdminAuthenticated) {
      alert("Aviso de Segurança: Você precisa concluir a Etapa de Segurança e EPIs obrigatória antes de acessar o formulário de agendamento!");
      setTab("safety");
    } else {
      setTab(tabId);
    }
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-white border-b border-slate-250/80 shadow-xs print:hidden">
      <div className="max-w-7xl mx-auto px-4 h-18 flex items-center justify-between">
        {/* Logo and Company Name */}
        <div 
          onClick={() => handleTabClick("home", false)}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="bg-[#003366] border border-[#002244] p-2.5 rounded-lg group-hover:scale-105 transition-transform duration-200 shadow-xs">
            <Ship className="h-6 w-6 text-orange-500" />
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-display text-xl font-bold tracking-tight text-[#003366]">WILSON SONS</span>
              <span className="text-[10px] font-mono text-orange-500 bg-orange-500/10 px-1.5 py-0.5 rounded font-bold">PORTOS</span>
            </div>
            <p className="text-[9px] text-slate-500 font-mono tracking-widest uppercase">Visitantes e Operações</p>
          </div>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1.5">
          <button
            onClick={() => handleTabClick("home", false)}
            className={`px-3.5 py-2.5 rounded-md font-medium text-sm transition-all duration-150 ${
              currentTab === "home"
                ? "bg-slate-100 text-[#003366] font-bold border-b-2 border-orange-500"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            Início
          </button>
          
          <button
            onClick={() => handleTabClick("safety", false)}
            className={`px-3.5 py-2.5 rounded-md font-medium text-sm transition-all duration-150 flex items-center gap-1.5 ${
              currentTab === "safety"
                ? "bg-slate-100 text-[#003366] font-bold border-b-2 border-orange-500"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <ShieldAlert className="h-4 w-4 text-orange-600" />
            EPI &amp; Segurança
          </button>

          <button
            onClick={() => handleTabClick("form", true)}
            className={`px-3.5 py-2.5 rounded-md font-medium text-sm transition-all duration-150 flex items-center gap-1.5 ${
              currentTab === "form"
                ? "bg-slate-100 text-[#003366] font-bold border-b-2 border-orange-500"
                : (!securityCleared && !isAdminAuthenticated)
                ? "text-slate-400 cursor-not-allowed"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <FileEdit className="h-4 w-4 text-slate-500" />
            Solicitar Visita
            {(!securityCleared && !isAdminAuthenticated) && (
              <span className="text-[9px] bg-slate-100 text-slate-400 border border-slate-200 px-1 py-0.5 rounded font-medium">Bloqueado</span>
            )}
          </button>

          <div className="w-[1px] h-6 bg-slate-200 mx-2" />

          <button
            onClick={onOpenAdminAuth}
            className={`px-4 py-2.5 rounded-md font-bold text-sm transition-all duration-150 flex items-center gap-2 ${
              currentTab === "admin"
                ? "bg-orange-500 text-white shadow-md"
                : "bg-[#003366] text-white hover:bg-[#002244] hover:shadow-xs shadow-xs"
            }`}
          >
            <LayoutDashboard className="h-4 w-4" />
            Painel Admin
          </button>
        </nav>

        {/* Mobile menu trigger button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-slate-600 hover:text-slate-950 hover:bg-slate-100 rounded-md transition-colors"
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-18 left-0 w-full bg-white border-b border-slate-200 shadow-lg py-4 px-4 flex flex-col gap-2 z-50">
          <button
            onClick={() => handleTabClick("home", false)}
            className={`w-full text-left px-4 py-3 rounded-md font-medium text-sm ${
              currentTab === "home" ? "bg-slate-100 text-orange-600 font-semibold" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            Início
          </button>
          
          <button
            onClick={() => handleTabClick("safety", false)}
            className={`w-full text-left px-4 py-3 rounded-md font-medium text-sm flex items-center gap-2 ${
              currentTab === "safety" ? "bg-slate-100 text-orange-600 font-semibold" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <ShieldAlert className="h-4 w-4 text-orange-500" />
            EPI &amp; Segurança
          </button>

          <button
            onClick={() => handleTabClick("form", true)}
            className={`w-full text-left px-4 py-3 rounded-md font-medium text-sm flex items-center justify-between ${
              currentTab === "form" ? "bg-slate-100 text-orange-600 font-semibold" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <span className="flex items-center gap-2">
              <FileEdit className="h-4 w-4 text-[#003366]" />
              Solicitar Visita
            </span>
            {(!securityCleared && !isAdminAuthenticated) && (
              <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded border border-slate-200">Requer EPI</span>
            )}
          </button>

          <div className="h-[1px] bg-slate-200 my-2" />

          <button
            onClick={() => {
              onOpenAdminAuth();
              setMobileMenuOpen(false);
            }}
            className="w-full text-center py-3 bg-[#003366] hover:bg-[#002244] text-white font-bold rounded-md transition-colors flex items-center justify-center gap-2"
          >
            <LayoutDashboard className="h-4 w-4" />
            Acessar Painel Administrador
          </button>
        </div>
      )}
    </header>
  );
}
