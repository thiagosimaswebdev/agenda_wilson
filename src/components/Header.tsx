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
    <header className="sticky top-0 z-50 w-full bg-white border-b border-slate-150 shadow-xs print:hidden">
      <div className="max-w-7xl mx-auto px-4 h-18 flex items-center justify-between">
        {/* Logo mimicking the official screenshot (Double W and Wilson, Sons typography) */}
        <div 
          onClick={() => handleTabClick("home", false)}
          className="flex items-center gap-2 cursor-pointer group"
        >
          <svg className="h-9 w-auto group-hover:scale-102 transition-transform select-none" viewBox="0 0 160 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Rounded light-blue/cyan box */}
            <rect x="2" y="2" width="36" height="36" rx="9" fill="#00AED6" fillOpacity="0.08" stroke="#00AED6" strokeOpacity="0.25" strokeWidth="1.5" />
            {/* Minimalist Vessel Cabin / Superstructure */}
            <path d="M16 21 V16.5 C16 15.5 17 15 20 15 C23 15 24 15.5 24 16.5 V21" stroke="#00AED6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            {/* Mast */}
            <path d="M20 15 V11" stroke="#00AED6" strokeWidth="1.8" strokeLinecap="round" />
            {/* Hull */}
            <path d="M13.5 21 C13.5 24.5 26.5 24.5 26.5 21" stroke="#00AED6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            {/* Bow center vertical marker */}
            <path d="M20 21 V24.2" stroke="#00AED6" strokeWidth="1.8" strokeLinecap="round" />
            {/* Soft wave below vessel */}
            <path d="M12 26 C14.5 24.8 16 24.8 20 26 C24 27.2 25.5 27.2 28 26" stroke="#00AED6" strokeWidth="1.8" strokeLinecap="round" fill="none" />
            
            {/* Brand typography matching the attachment */}
            <text x="47" y="21" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="800" fontSize="16.5" fill="#003366" letterSpacing="-0.3">Wilson Sons</text>
            <text x="47" y="32" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="800" fontSize="7.5" fill="#00AED6" letterSpacing="0.8">PORTOS &amp; SESMT</text>
          </svg>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1.5">
          <button
            onClick={() => handleTabClick("home", false)}
            className={`px-3.5 py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider transition-all duration-150 ${
              currentTab === "home"
                ? "text-[#003366] bg-slate-50 border-b-2 border-[#00AED6]"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            Início
          </button>
          
          <button
            onClick={() => handleTabClick("safety", false)}
            className={`px-3.5 py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider transition-all duration-150 flex items-center gap-1.5 ${
              currentTab === "safety"
                ? "text-[#003366] bg-slate-50 border-b-2 border-[#00AED6]"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <ShieldAlert className="h-4 w-4 text-[#00AED6]" />
            EPI &amp; Segurança
          </button>

          <button
            onClick={() => handleTabClick("form", true)}
            className={`px-3.5 py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider transition-all duration-150 flex items-center gap-1.5 ${
              currentTab === "form"
                ? "text-[#003366] bg-slate-50 border-b-2 border-[#00AED6]"
                : (!securityCleared && !isAdminAuthenticated)
                ? "text-slate-350 cursor-not-allowed"
                : "text-slate-600 hover:text-[#003366] hover:bg-slate-50"
            }`}
          >
            <FileEdit className="h-4 w-4 text-slate-400" />
            Solicitar Visita
            {(!securityCleared && !isAdminAuthenticated) && (
              <span className="text-[8px] bg-slate-100 text-slate-400 border border-slate-200 px-1.5 py-0.5 rounded font-bold uppercase">Bloqueado</span>
            )}
          </button>

          <div className="w-[1px] h-6 bg-slate-200 mx-1" />

          <button
            onClick={onOpenAdminAuth}
            className={`px-4 py-2 rounded-full font-bold text-xs uppercase tracking-wider transition-all shadow-sm flex items-center gap-2 hover:scale-102 cursor-pointer ${
              currentTab === "admin"
                ? "bg-[#003366] text-white"
                : "bg-[#00AED6] text-white hover:bg-[#0094b8] hover:shadow-md"
            }`}
          >
            <LayoutDashboard className="h-3.5 w-3.5" />
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
        <div className="md:hidden absolute top-20 left-0 w-full bg-white border-b border-slate-200 shadow-xl py-4 px-4 flex flex-col gap-2 z-50">
          <button
            onClick={() => handleTabClick("home", false)}
            className={`w-full text-left px-4 py-3 rounded-md font-bold text-xs uppercase border-l-2 ${
              currentTab === "home" ? "bg-slate-50 text-[#00AED6] border-[#00AED6]" : "text-slate-600 border-transparent hover:bg-slate-50"
            }`}
          >
            Início
          </button>
          
          <button
            onClick={() => handleTabClick("safety", false)}
            className={`w-full text-left px-4 py-3 rounded-md font-bold text-xs uppercase border-l-2 flex items-center gap-2 ${
              currentTab === "safety" ? "bg-slate-50 text-[#00AED6] border-[#00AED6]" : "text-slate-600 border-transparent hover:bg-slate-50"
            }`}
          >
            <ShieldAlert className="h-4 w-4 text-[#00AED6]" />
            EPI &amp; Segurança
          </button>

          <button
            onClick={() => handleTabClick("form", true)}
            className={`w-full text-left px-4 py-3 rounded-md font-bold text-xs uppercase border-l-2 flex items-center justify-between ${
              currentTab === "form" ? "bg-slate-50 text-[#00AED6] border-[#00AED6]" : "text-slate-600 border-transparent hover:bg-slate-50"
            }`}
          >
            <span className="flex items-center gap-2">
              <FileEdit className="h-4 w-4 text-slate-400" />
              Solicitar Visita
            </span>
            {(!securityCleared && !isAdminAuthenticated) && (
              <span className="text-[9px] bg-slate-100 text-slate-400 px-2 py-0.5 rounded border border-slate-200">Requer EPI</span>
            )}
          </button>

          <div className="h-[1px] bg-slate-150 my-2" />

          <button
            onClick={() => {
              onOpenAdminAuth();
              setMobileMenuOpen(false);
            }}
            className="w-full text-center py-3 bg-[#00AED6] hover:bg-[#0094b8] text-white font-bold text-xs uppercase tracking-wider rounded-full transition-colors flex items-center justify-center gap-2"
          >
            <LayoutDashboard className="h-4 w-4" />
            Acessar Painel Administrador
          </button>
        </div>
      )}
    </header>
  );
}
