import React from "react";
import { Ship, ShieldAlert, ArrowRight, Anchor, Navigation, Calendar, Award } from "lucide-react";

interface StepHomeProps {
  onStartRequest: () => void;
}

export function StepHome({ onStartRequest }: StepHomeProps) {
  return (
    <div className="space-y-16 py-8 animate-fade-in">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-8 sm:p-12 md:p-16 text-center shadow-lg">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-slate-100/40 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl pointer-events-none" />
 
        <div className="relative max-w-4xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 px-3.5 py-1.5 rounded-full text-xs font-mono text-orange-600 font-bold uppercase tracking-wider">
            <Anchor className="h-4 w-4 text-orange-500" />
            LÍDER EM SOLUÇÕES PORTUÁRIAS E MARÍTIMAS
          </div>
          
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-[#003366] leading-tight">
            Gestão Integrada de <span className="text-orange-500">Visitas Institucionais</span>
          </h1>
          
          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Seja bem-vindo ao portal de agendamento da Wilson Sons. Centralize sua solicitação de visita técnica ou institucional a um de nossos portos, estaleiros e terminais de forma ágil e segura.
          </p>
 
          <div className="pt-4 flex flex-col sm:flex-row justify-center items-center gap-4">
            <button
              onClick={onStartRequest}
              className="w-full sm:w-auto px-8 py-4 bg-orange-500 hover:bg-orange-600 text-white font-bold text-base rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:scale-[1.02] active:scale-95"
            >
              <span>Solicitar Visita Institucional</span>
              <ArrowRight className="h-5 w-5" />
            </button>
            <a
              href="#about"
              className="w-full sm:w-auto px-8 py-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium text-base rounded-lg border border-slate-200 transition-colors flex items-center justify-center"
            >
              Conhecer a Empresa
            </a>
          </div>
        </div>
      </section>
 
      {/* Grid Highlights */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs space-y-3">
          <div className="bg-orange-50/80 w-12 h-12 rounded-lg flex items-center justify-center border border-orange-500/10">
            <Navigation className="h-6 w-6 text-orange-500" />
          </div>
          <h3 className="font-display font-bold text-lg text-[#003366]">Presença Nacional</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Atuação de norte a sul do Brasil com ampla infraestrutura, terminais de containers modernos e a maior frota de rebocadores do país.
          </p>
        </div>
 
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs space-y-3">
          <div className="bg-orange-50/80 w-12 h-12 rounded-lg flex items-center justify-center border border-orange-500/10">
            <ShieldAlert className="h-6 w-6 text-orange-500" />
          </div>
          <h3 className="font-display font-bold text-lg text-[#003366]">Segurança em Primeiro Lugar</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Ambiente portuário seguro. Todo visitante passa obrigatoriamente por treinamento e conscientização de uso de EPIs antes de acessar as docas.
          </p>
        </div>
 
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs space-y-3">
          <div className="bg-orange-50/80 w-12 h-12 rounded-lg flex items-center justify-center border border-orange-500/10">
            <Calendar className="h-6 w-6 text-orange-500" />
          </div>
          <h3 className="font-display font-bold text-lg text-[#003366]">Agendamento Ágil</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Substitua a burocracia por um fluxo digital integrado com acompanhamento de aprovação e notificações automáticas pelo painel.
          </p>
        </div>
      </section>
 
      {/* Institutional Presentation Video & Description */}
      <section id="about" className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center pt-6">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-1.5 text-xs text-orange-600 font-mono font-bold uppercase tracking-wider">
            <Award className="h-4 w-4" />
            Wilson Sons S.A.
          </div>
          <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-[#003366] tracking-tight leading-tight">
            Mais de 180 anos impulsionando o <span className="text-orange-500">comércio marítimo</span> e a infraestrutura brasileira
          </h2>
          <div className="space-y-4 text-slate-600 text-sm sm:text-base leading-relaxed">
            <p>
              A <strong className="text-slate-800">Wilson Sons</strong> é uma das maiores operadoras integradas de logística portuária e marítima do mercado brasileiro. Com mais de 180 anos de história, a companhia oferece soluções de ponta a ponta, conectando negócios nacionais e internacionais a players mundiais com extrema eficiência e confiabilidade.
            </p>
            <p>
              Nossa atuação abrange terminais de containers estrategicamente localizados (Salvador e Rio Grande), uma vasta frota de rebocadores modernos com altíssima capacidade de tração, bases de apoio offshore para a indústria de óleo e gás, estaleiros navais, logística de comércio exterior regulamentada e agenciamento marítimo de carga de calibre internacional.
            </p>
            <p className="text-xs text-slate-500 italic">
              Conheça mais sobre a nossa robustez técnica e operacional assistindo ao nosso vídeo institucional oficial ao lado.
            </p>
          </div>
        </div>
 
        {/* Embedded Video */}
        <div className="relative group animate-fade-in">
          <div className="absolute -inset-1 bg-slate-200 rounded-2xl blur-xs opacity-50 group-hover:opacity-80 transition-opacity pointer-events-none" />
          <div className="relative bg-[#003366] border border-slate-200 rounded-2xl overflow-hidden aspect-video shadow-lg">
            {/* The institutional video URL is: https://www.youtube.com/watch?v=rB6jcirH848&list=PLWyZ9ag5XaAIFIcKbzstvoiRMQ8Td3125 */}
            <iframe
              src="https://www.youtube.com/embed/rB6jcirH848?autoplay=0&rel=0"
              title="Wilson Sons Institucional"
              className="w-full h-full border-0 absolute top-0 left-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
          <p className="text-center text-xs text-slate-500 mt-3 font-mono">
            Vídeo Institucional Wilson Sons
          </p>
        </div>
      </section>
 
      {/* Safety Banner Highlight Call-to-action */}
      <section className="bg-white border border-slate-200 p-8 sm:p-10 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
        <div className="space-y-2 max-w-xl">
          <div className="flex items-center gap-2 text-orange-500 font-mono font-bold text-xs uppercase tracking-wider">
            <ShieldAlert className="h-4 w-4 animate-pulse text-orange-500" />
            DIRETRIZ DE SEGURANÇA E ACESSO
          </div>
          <h3 className="font-display font-extrabold text-xl sm:text-2xl text-[#003366]">
            Treinamento e Conscientização de EPI Obrigatório
          </h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Para garantir a integridade dos visitantes e colaboradores, o acesso às nossas áreas operacionais é rigorosamente monitorado. É obrigatório passar pelo tutorial de segurança antes de efetuar seu pedido de agendamento.
          </p>
        </div>
        <button
          onClick={onStartRequest}
          className="w-full md:w-auto shrink-0 px-6 py-4 bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm sm:text-base rounded-lg transition-all duration-200 flex items-center justify-center gap-2 hover:scale-[1.02] shadow-sm"
        >
          <span>Ir para Etapa de Segurança</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </section>
    </div>
  );
}
