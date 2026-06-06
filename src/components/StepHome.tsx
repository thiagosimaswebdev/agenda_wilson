import React, { useState, useEffect } from "react";
import { Ship, ShieldAlert, ArrowRight, Anchor, Navigation, Calendar, Award, Search, AlertTriangle, XCircle, QrCode, ChevronLeft, ChevronRight, Play } from "lucide-react";
import { VisitRequest, VisitStatus } from "../types";
import { VirtualBadge } from "./VirtualBadge";

interface StepHomeProps {
  onStartRequest: () => void;
  requests: VisitRequest[];
}

export function StepHome({ onStartRequest, requests }: StepHomeProps) {
  const [searchCpf, setSearchCpf] = useState("");
  const [searchResult, setSearchResult] = useState<{
    status: "none" | "pending" | "rejected" | "approved";
    request?: VisitRequest;
  }>({ status: "none" });
  const [showBadge, setShowBadge] = useState(false);

  // Carousel slider state for the main Hero banner
  const [currentSlide, setCurrentSlide] = useState(0);
  const [partnerOffset, setPartnerOffset] = useState(0);

  const slides = [
    {
      image: "https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=1600&q=80",
      title: "Agendamento de Visitas e Credenciamento",
      subtitle: "ACESSO INTEGRADO AO PORTO",
      description: "Realize seu agendamento obrigatório de entrada e gerencie suas credenciais de segurança em poucos minutos.",
      linkText: "Começar agora"
    },
    {
      image: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1600&q=80",
      title: "Segurança de Acesso e Padrão SESMT",
      subtitle: "PREVENÇÃO E CONFORMIDADE TÉCNICA",
      description: "Complete seu briefing interativo de EPIs obrigatórios para habilitar a emissão do seu Crachá de Visita.",
      linkText: "Requisitos de segurança"
    },
    {
      image: "https://images.unsplash.com/photo-1494412574643-ff11b0a5c1c3?auto=format&fit=crop&w=1600&q=80",
      title: "Controle Portuário de Classe Mundial",
      subtitle: "EFICIÊNCIA E INTEGRIDADE DE ATIVOS",
      description: "Agilize a liberação de contratados e visitantes com crachás padronizados integrados aos portos e terminais.",
      linkText: "Manual do visitante"
    }
  ];

  // Partners list
  const partners = [
    { name: "Ultrabulk", subtitle: "DRY BULK SHIPPING", isUltrabulk: true },
    { name: "COSCO SHIPPING", isCosco: true },
    { name: "ambev", isAmbev: true },
    { name: "enel", isEnel: true },
    { name: "BŪNGE", isBunge: true },
    { name: "MONSANTO", isMonsanto: true }
  ];

  // Auto-play the main hero banner slider
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [slides.length]);

  // Auto-slide the partner logos every 3 seconds for a smooth continuous effect
  useEffect(() => {
    const timer = setInterval(() => {
      setPartnerOffset((prev) => (prev + 1) % partners.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [partners.length]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  // Auto-format CPF
  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 11) value = value.slice(0, 11);
    
    if (value.length > 9) {
      value = `${value.slice(0, 3)}.${value.slice(3, 6)}.${value.slice(6, 9)}-${value.slice(9)}`;
    } else if (value.length > 6) {
      value = `${value.slice(0, 3)}.${value.slice(3, 6)}.${value.slice(6)}`;
    } else if (value.length > 3) {
      value = `${value.slice(0, 3)}.${value.slice(3)}`;
    }
    setSearchCpf(value);
  };

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchCpf) return;

    // Search for matching request in local database
    const match = requests.find(
      (r) => r.cpf.trim() === searchCpf.trim() || r.cpf.replace(/\D/g, "") === searchCpf.replace(/\D/g, "")
    );

    if (!match) {
      setSearchResult({ status: "none", request: undefined });
      alert("Nenhum agendamento encontrado para este CPF. Verifique os dados ou crie uma nova solicitação.");
      return;
    }

    if (match.status === VisitStatus.PENDING) {
      setSearchResult({ status: "pending", request: match });
    } else if (match.status === VisitStatus.REJECTED) {
      setSearchResult({ status: "rejected", request: match });
    } else if (match.status === VisitStatus.APPROVED) {
      setSearchResult({ status: "approved", request: match });
      setShowBadge(true);
    }
  };

  const nextPartner = () => {
    setPartnerOffset((prev) => (prev + 1) % partners.length);
  };

  const prevPartner = () => {
    setPartnerOffset((prev) => (prev - 1 + partners.length) % partners.length);
  };

  return (
    <div className="space-y-16 py-6 animate-fade-in font-sans">
      
      {/* Premium Hero Slider (Directly replicating the official UI in the layout) */}
      <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 h-[380px] sm:h-[460px] md:h-[500px] shadow-2xl group">
        {slides.map((slide, index) => (
          <div
            key={slide.title}
            className={`absolute inset-0 transition-all duration-1000 ease-in-out ${
              index === currentSlide ? "opacity-100 scale-100" : "opacity-0 scale-105 pointer-events-none"
            }`}
          >
            {/* Background Image with port overlay darken */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#001D3D]/95 via-[#002B5C]/75 to-transparent z-10" />
            <img
              src={slide.image}
              alt=""
              className="w-full h-full object-cover select-none"
              referrerPolicy="no-referrer"
            />

            {/* Content over Slide */}
            <div className="absolute inset-0 z-20 flex flex-col justify-center px-6 sm:px-12 md:px-16 max-w-4xl text-left select-none">
              <span className="text-[10px] md:text-xs font-mono font-bold text-[#00AED6] bg-[#00AED6]/15 px-3 py-1 rounded-full w-fit tracking-widest uppercase mb-4">
                ACESSO INTEGRADO AO PORTO
              </span>
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-5xl font-extrabold text-white leading-tight tracking-tight max-w-2xl">
                Agendamento de Visitas e Credenciamento
              </h1>
              <p className="mt-3 text-xs sm:text-sm md:text-base text-slate-300 max-w-xl font-medium leading-relaxed">
                Realize seu agendamento obrigatório de entrada e gerencie suas credenciais de segurança em poucos minutos.
              </p>
              
              <div className="mt-6 sm:mt-8 flex flex-wrap items-center gap-4">
                <button
                  onClick={onStartRequest}
                  className="px-6 py-3 bg-[#00AED6] hover:bg-[#0094b8] text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-all shadow-md flex items-center gap-2 hover:scale-102 cursor-pointer"
                >
                  <span>Solicitar Credencial</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById("about-sec");
                    el?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="text-white hover:text-[#00AED6] font-bold text-xs uppercase tracking-wider transition-all underline decoration-[#00AED6] decoration-2"
                >
                  Começar agora
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* Carousel Visual Arrows (Manual Cycling) */}
        <button
          onClick={prevSlide}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 bg-black/40 hover:bg-[#00AED6] text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all select-none cursor-pointer"
          aria-label="Retroceder Slide"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          onClick={nextSlide}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 bg-black/40 hover:bg-[#00AED6] text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all select-none cursor-pointer"
          aria-label="Avançar Slide"
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        {/* Custom Chevron and Play ornament decoration mirroring the website mockup search layout (>>>>) */}
        <div className="absolute right-12 bottom-12 z-30 hidden md:flex flex-col items-center gap-1 opacity-80 select-none">
          <div className="flex flex-col items-center -space-y-1 text-[#00AED6]/30 font-extrabold text-lg select-none">
            <span className="text-white">🩳</span>
            <span>⌵</span>
            <span>⌵</span>
            <span>⌵</span>
            <span>⌵</span>
          </div>
          <div className="w-10 h-10 rounded-full border border-white/40 bg-white/20 flex items-center justify-center text-[#00AED6] animate-pulse">
            <Play className="h-4 w-4 fill-current ml-0.5" />
          </div>
        </div>

        {/* Slide Indicators / Paginations */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 select-none">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentSlide(i)}
              className={`h-2.5 rounded-full transition-all duration-350 cursor-pointer ${
                i === currentSlide ? "w-8 bg-[#00AED6]" : "w-2.5 bg-white/45 hover:bg-white/70"
              }`}
              aria-label={`Ir para slide ${i + 1}`}
            />
          ))}
        </div>
      </section>

      {/* Floating Glassmorphic Quick Audit and Search Consultation Block (Integrates seamlessly) */}
      <section className="bg-slate-50 border border-slate-200/80 p-5 sm:p-6 rounded-2xl shadow-md relative max-w-5xl mx-auto -mt-24 z-40 backdrop-blur-md bg-white/95">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-5 space-y-1 text-left">
            <div className="flex items-center gap-1.5 text-[#00AED6] font-mono font-bold text-[9px] tracking-wider uppercase">
              <QrCode className="h-3.5 w-3.5" />
              SISTEMA INTEGRADO SESMT
            </div>
            <h3 className="font-display font-extrabold text-base sm:text-lg text-[#003366] leading-tight">
              Consultar Status de Solicitação
            </h3>
            <p className="text-[11px] text-slate-500 leading-normal">
              Digite seu CPF para consultar em tempo real se seu crachá profissional (85mm x 135mm) de acesso já está aprovado e pronto para descarga ou impressão.
            </p>
          </div>

          <div className="lg:col-span-7 bg-slate-100 p-3 rounded-xl border border-slate-200">
            <form onSubmit={handleLookup} className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="000.000.000-00 (CPF)"
                  value={searchCpf}
                  onChange={handleCpfChange}
                  className="w-full bg-white border border-slate-250 rounded-lg py-2 pl-9 pr-4 text-xs font-semibold text-slate-800 placeholder-slate-400 font-mono tracking-wide focus:outline-none focus:border-[#00AED6] focus:ring-1 focus:ring-[#00AED6]"
                  required
                />
              </div>
              <button
                type="submit"
                className="px-5 py-2 bg-[#003366] hover:bg-[#002244] text-white text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-2 shadow-2xs cursor-pointer"
              >
                Buscar Credencial
              </button>
            </form>

            {/* Quick validation result container if active */}
            {searchResult.status !== "none" && searchResult.request && (
              <div className="mt-2 text-left">
                <div className={`p-2.5 rounded-lg flex items-center justify-between text-xs font-sans ${
                  searchResult.status === "approved" 
                    ? "bg-emerald-50 text-emerald-950 border border-emerald-250" 
                    : searchResult.status === "pending"
                    ? "bg-amber-50 text-amber-950 border border-amber-250"
                    : "bg-rose-50 text-rose-950 border border-rose-250"
                }`}>
                  <div className="flex items-center gap-2">
                    {searchResult.status === "approved" ? "🏆" : searchResult.status === "pending" ? "⏳" : "❌"}
                    <div>
                      <div className="font-bold">CPF {searchResult.request.cpf} – {searchResult.request.fullName}</div>
                      <div className="font-medium text-[10px] mt-0.5 opacity-85">
                        Status: <strong className="uppercase">{searchResult.request.status}</strong> 
                        {searchResult.status === "approved" && " - Toque para visualizar o Crachá SESMT."}
                        {searchResult.status === "rejected" && ` - Motivo: ${searchResult.request.rejectionReason || "Requisitos de segurança"}`}
                      </div>
                    </div>
                  </div>
                  {searchResult.status === "approved" && (
                    <button
                      type="button"
                      onClick={() => setShowBadge(true)}
                      className="px-2.5 py-1 bg-[#059669] hover:bg-[#047857] text-white text-[9px] uppercase font-mono font-bold rounded shadow-xs cursor-pointer select-none"
                    >
                      Ver Crachá ✓
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 100% Full-Width Clients & Partners Slider Section (Directly aligned with layout request area) */}
      <section className="w-screen relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] bg-[#F8FAFC] border-y border-slate-200/50 py-6 select-none z-30 overflow-hidden">
        {/* Label Above */}
        <div className="max-w-7xl mx-auto px-6 mb-4 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00AED6] animate-pulse" />
          <h4 className="text-[10px] font-black text-[#003366] uppercase tracking-wider">
            Clientes &amp; Parcerias Wilson Sons
          </h4>
        </div>

        {/* Dynamic constant looping marquee below (no borders, smooth CSS marquee) */}
        <div className="w-full overflow-hidden relative py-3 bg-white border-y border-slate-100">
          <div className="animate-marquee flex items-center gap-20 whitespace-nowrap">
            {[...partners, ...partners, ...partners, ...partners].map((p, idx) => (
              <div
                key={`${p.name}-${idx}`}
                className="flex-shrink-0 select-none bg-transparent border-0 px-6 py-2 min-w-[130px] flex items-center justify-center text-[10px] font-bold text-slate-700"
              >
                {p.isCosco && (
                  <div className="flex flex-col items-center leading-none text-center">
                    <span className="text-[10px] font-black tracking-tight text-[#003366]">COSCO</span>
                    <span className="text-[5px] font-mono font-bold text-[#00AED6] tracking-widest">SHIPPING</span>
                  </div>
                )}
                {p.isAmbev && (
                  <span className="text-[12px] font-black italic lowercase text-[#003366] tracking-tighter leading-none">ambev</span>
                )}
                {p.isEnel && (
                  <span className="text-[10px] font-bold text-slate-800 tracking-tight flex items-center gap-0.5 leading-none">enel<span className="w-1 h-1 rounded-full bg-emerald-500" /></span>
                )}
                {p.isBunge && (
                  <span className="text-[10px] font-black text-slate-800 leading-none">B<span className="text-cyan-600">Ū</span>NGE</span>
                )}
                {p.isMonsanto && (
                  <span className="text-[9px] font-bold text-slate-600 leading-none flex items-center gap-0.5">🌾 <span className="text-[8.5px] uppercase">Monsanto</span></span>
                )}
                {p.isUltrabulk && (
                  <div className="flex flex-col items-center leading-none">
                    <span className="text-[10px] font-black text-[#003366]">Ultrabulk</span>
                    <span className="text-[5.5px] font-mono text-slate-400">SHIPPING</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Grid Highlights (Sleek minimalist widgets) */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-3 hover:shadow-md transition-shadow">
          <div className="bg-[#00AED6]/10 w-12 h-12 rounded-lg flex items-center justify-center border border-[#00AED6]/25">
            <Navigation className="h-6 w-6 text-[#00AED6]" />
          </div>
          <h4 className="font-display font-bold text-base text-[#003366]">Presença e Escala Nacional</h4>
          <p className="text-xs text-slate-600 leading-relaxed">
            Operamos de norte a sul com portos integrados, estaleiros modernos e a maior frota de rebocadores homologados com certificação SESMT do Brasil.
          </p>
        </div>
 
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-3 hover:shadow-md transition-shadow">
          <div className="bg-[#003366]/5 w-12 h-12 rounded-lg flex items-center justify-center border border-[#003366]/10">
            <ShieldAlert className="h-6 w-6 text-[#003366]" />
          </div>
          <h4 className="font-display font-bold text-base text-[#003366]">Segurança Operacional Absoluta</h4>
          <p className="text-xs text-slate-600 leading-relaxed">
            Ambiente de alto risco requer tolerância zero. Conclua o briefing de segurança obrigatório e configure seus EPIs para liberar a emissão do Crachá.
          </p>
        </div>
 
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-3 hover:shadow-md transition-shadow">
          <div className="bg-[#00AED6]/10 w-12 h-12 rounded-lg flex items-center justify-center border border-[#00AED6]/25">
            <Calendar className="h-6 w-6 text-[#00AED6]" />
          </div>
          <h4 className="font-display font-bold text-base text-[#003366]">Agregado Digital e Notificações</h4>
          <p className="text-xs text-slate-600 leading-relaxed">
            Workflow e relatórios de SMTP integrados reduzem o tempo de aprovação. Sua ficha gera um crachá físico padronizado com QR Code instantâneo.
          </p>
        </div>
      </section>
 
      {/* Institutional Presentation Video & Description */}
      <section id="about-sec" className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center pt-6 text-left border-t border-slate-100">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-1.5 text-xs text-[#00AED6] font-mono font-bold uppercase tracking-wider">
            <Award className="h-4 w-4" />
            Wilson Sons S.A.
          </div>
          <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-[#003366] tracking-tight leading-tight">
            Mais de 180 anos impulsionando o <span className="text-[#00AED6]">comércio marítimo</span> brasileiro
          </h2>
          <div className="space-y-4 text-slate-600 text-sm leading-relaxed">
            <p>
              A <strong className="text-[#003366]">Wilson Sons</strong> é uma das maiores operadoras integradas de logística portuária e marítima do mercado nacional. Oferecemos as melhores soluções técnicas de apoio portuário, otimizando o fluxo logístico e aduaneiro com alto rigor de engenharia de segurança de trabalho.
            </p>
            <p>
              Nossa atuação de prestígio abrange bases de apoio logístico offshore direcionadas à produção de óleo e gás, estaleiros navais altamente especializados e agenciamento marítimo de carga global.
            </p>
          </div>
        </div>
 
        {/* Embedded Video Widget */}
        <div className="relative group">
          <div className="absolute -inset-1 bg-slate-200 rounded-2xl blur-xs opacity-50 group-hover:opacity-80 transition-opacity pointer-events-none" />
          <div className="relative bg-[#002B5C] border border-slate-200 rounded-2xl overflow-hidden aspect-video shadow-lg">
            <iframe
              src="https://www.youtube.com/embed/rB6jcirH848?autoplay=0&rel=0"
              title="Wilson Sons Institucional"
              className="w-full h-full border-0 absolute top-0 left-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      </section>

      {/* Modal Overlay to show approved Virtual Badge */}
      {showBadge && searchResult.request && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto animate-fade-in print:p-0">
          <div className="w-full max-w-sm relative">
            <VirtualBadge 
              request={searchResult.request} 
              onClose={() => setShowBadge(false)} 
            />
          </div>
        </div>
      )}
    </div>
  );
}
