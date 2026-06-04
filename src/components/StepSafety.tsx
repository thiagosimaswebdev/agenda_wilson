import React, { useState } from "react";
import { ShieldAlert, ShieldCheck, Eye, EyeOff, Ban, CheckCircle, Info, HardHat, Footprints, Flame, AlertCircle } from "lucide-react";

interface StepSafetyProps {
  onClearedSecurity: () => void;
  securityCleared: boolean;
}

export function StepSafety({ onClearedSecurity, securityCleared }: StepSafetyProps) {
  const [checkedWatch, setCheckedWatch] = useState(securityCleared);
  const [checkedUnderstand, setCheckedUnderstand] = useState(securityCleared);
  const [checkedEpiAware, setCheckedEpiAware] = useState(securityCleared);
  const [checkedTerms, setCheckedTerms] = useState(securityCleared);

  const allChecked = checkedWatch && checkedUnderstand && checkedEpiAware && checkedTerms;

  const handleSubmit = () => {
    if (allChecked) {
      onClearedSecurity();
    }
  };

  return (
    <div className="space-y-12 py-8 max-w-5xl mx-auto animate-fade-in">
      {/* Title & Alert Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 bg-orange-50 border border-orange-200 px-4 py-2 rounded-full text-xs font-mono text-orange-600 font-bold uppercase tracking-wider shadow-xs">
          <ShieldAlert className="h-4 w-4 text-orange-500 animate-bounce" />
          MÓDULO DE CONSCIENTIZAÇÃO OBRIGATÓRIA
        </div>
        <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-[#003366] tracking-tight">
          Normas de Segurança de Operações e Uso de <span className="text-orange-500">EPIs</span>
        </h1>
        <p className="text-slate-600 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
          De acordo com as normas regulamentadoras nacionais (NR-29), o acesso de qualquer visitante a portos, estaleiros ou terminais Wilson Sons está estritamente condicionado ao conhecimento das regras de segurança operacional.
        </p>
      </div>

      {/* Grid of Safety Rules */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Prohibited: Dress code rules */}
        <div className="bg-red-50/40 border border-red-200 rounded-2xl p-6 space-y-4 shadow-xs">
          <div className="flex items-center gap-2 text-red-750 font-display font-bold text-lg">
            <Ban className="h-5 w-5 shrink-0 text-red-500" />
            <h4 className="text-red-700 font-bold">Vestimentas Proibidas (Acesso Vetado)</h4>
          </div>
          <p className="text-xs text-slate-500">
            Visitantes vestindo qualquer um dos itens abaixo não terão permissão de ultrapassar a portaria, mesmo com agendamento prévio aprovado.
          </p>
          <ul className="space-y-2 text-sm text-slate-700 font-medium">
            <li className="flex items-center gap-3 bg-white border border-red-100/80 px-3 py-2.5 rounded-xl shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              <span>Regatas de qualquer espécie (Ombros descobertos)</span>
            </li>
            <li className="flex items-center gap-3 bg-white border border-red-100/80 px-3 py-2.5 rounded-xl shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              <span>Bermudas, Shorts, Calções ou minissaias</span>
            </li>
            <li className="flex items-center gap-3 bg-white border border-red-100/80 px-3 py-2.5 rounded-xl shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              <span>Sapatos Abertos (Chinelos, sandálias rasteiras, tamancos)</span>
            </li>
          </ul>
        </div>

        {/* Mandatory PPE */}
        <div className="bg-emerald-50/40 border border-emerald-250 rounded-2xl p-6 space-y-4 shadow-xs">
          <div className="flex items-center gap-2 text-emerald-750 font-display font-bold text-lg">
            <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-600" />
            <h4 className="text-emerald-800 font-bold">EPIs Obrigatórios (Fornecidos no Local)</h4>
          </div>
          <p className="text-xs text-slate-500">
            Equipamentos de Proteção Individual que devem ser utilizados ininterruptamente durante todo o período de estada nas áreas operacionais.
          </p>
          <ul className="space-y-2 text-sm text-slate-700 font-medium">
            <li className="flex items-center gap-3 bg-white border border-emerald-100 px-3 py-2.5 rounded-xl shadow-xs">
              <HardHat className="h-4.5 w-4.5 text-emerald-500 shrink-0" />
              <span>Capacete de proteção industrial (com jugular ajustada)</span>
            </li>
            <li className="flex items-center gap-3 bg-white border border-emerald-100 px-3 py-2.5 rounded-xl shadow-xs">
              <Footprints className="h-4.5 w-4.5 text-emerald-500 shrink-0" />
              <span>Calçado de segurança fechado (bota com biqueira de aço)</span>
            </li>
            <li className="flex items-center gap-3 bg-white border border-emerald-100 px-3 py-2.5 rounded-xl shadow-xs">
              <Flame className="h-4.5 w-4.5 text-emerald-500 shrink-0" />
              <span>Coleto Refletivo de Alta Visibilidade (cor laranja/amarela)</span>
            </li>
          </ul>
        </div>
      </section>

      {/* General Orientations */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-4 shadow-sm">
        <h3 className="font-display font-bold text-xl text-[#003366] flex items-center gap-2">
          <Info className="h-5 w-5 text-orange-500" />
          Orientações Gerais de Segurança Física
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs sm:text-sm text-slate-650 leading-relaxed">
          <div className="space-y-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-205/60 text-slate-650">
              <strong className="text-orange-600 block mb-1 font-bold">Caminhos demarcados:</strong>
              Mantenha-se rigorosamente dentro das faixas amarelas pintadas no solo (faixas de trânsito exclusivo de pedestre). Nunca invada as vias de empilhadeiras.
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-205/60 text-slate-650">
              <strong className="text-orange-600 block mb-1 font-bold">Carga Suspensa:</strong>
              Preste atenção aos alarmes sonoros e giroflex dos guindastes STS. Nunca caminhe embaixo de containers ou de braços hidráulicos de carga.
            </div>
          </div>
          <div className="space-y-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-205/60 text-slate-650">
              <strong className="text-orange-600 block mb-1 font-bold">Uso de Crachá:</strong>
              O crachá fornecido na portaria deve ser mantido sempre no peito, em local visível, e deve ser devolvido na portaria ao final da visitação.
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-205/60 text-slate-650">
              <strong className="text-orange-600 block mb-1 font-bold">Uso de Celular:</strong>
              É terminantemente proibido registrar fotos ou vídeos de áreas operacionais restringidas sem a permissão explícita de seu anfitrião Wilson Sons.
            </div>
          </div>
        </div>
      </section>

      {/* Training Video Section */}
      <section className="space-y-4">
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden p-4 sm:p-6 shadow-sm">
          <h4 className="font-display font-bold text-lg text-[#003366] mb-4 text-center sm:text-left flex items-center justify-center sm:justify-start gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-ping" />
            Vídeo de Integração OBRIGATÓRIO (EPIs &amp; Segurança)
          </h4>
          <div className="relative rounded-xl overflow-hidden aspect-video shadow-lg bg-black">
            {/* The video link is: https://www.youtube.com/watch?v=JFZny-M0xmw */}
            <iframe
              src="https://www.youtube.com/embed/JFZny-M0xmw?autoplay=0&rel=0"
              title="Vídeo de Segurança de EPIs"
              className="w-full h-full border-0 absolute top-0 left-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
          <div className="mt-3 flex items-center gap-2 text-slate-500 text-xs justify-center sm:justify-start font-mono">
            <AlertCircle className="h-4 w-4 text-orange-500" />
            <span>Assista ao vídeo explicativo acima por completo para liberar o formulário.</span>
          </div>
        </div>
      </section>

      {/* Verification Checkboxes */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6 shadow-md">
        <h4 className="font-display font-bold text-lg text-[#003366] text-center pb-2 border-b border-slate-100">
          Declaração de Consciência Operacional
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          {/* CB 1 */}
          <label className="flex items-start gap-3 p-4 rounded-xl bg-slate-50 hover:bg-slate-100 cursor-pointer border border-slate-200/60 select-none transition-colors">
            <input
              type="checkbox"
              checked={checkedWatch}
              onChange={(e) => setCheckedWatch(e.target.checked)}
              className="mt-1 h-4 w-4 text-orange-500 focus:ring-orange-500 focus:ring-offset-0 rounded border-slate-350 cursor-pointer accent-orange-500"
            />
            <div className="text-xs sm:text-sm">
              <span className="font-bold text-slate-800 block">Assisti ao vídeo completo</span>
              <span className="text-slate-500 text-[11px]">Assisti integralmente às instruções de segurança operacional Wilson Sons.</span>
            </div>
          </label>

          {/* CB 2 */}
          <label className="flex items-start gap-3 p-4 rounded-xl bg-slate-50 hover:bg-slate-100 cursor-pointer border border-slate-200/60 select-none transition-colors">
            <input
              type="checkbox"
              checked={checkedUnderstand}
              onChange={(e) => setCheckedUnderstand(e.target.checked)}
              className="mt-1 h-4 w-4 text-orange-500 focus:ring-orange-500 focus:ring-offset-0 rounded border-slate-350 cursor-pointer accent-orange-500"
            />
            <div className="text-xs sm:text-sm">
              <span className="font-bold text-slate-800 block">Compreendi as orientações de segurança</span>
              <span className="text-slate-500 text-[11px]">Entendi as diretrizes de tráfego, faixas demarcadas e regras de proibição.</span>
            </div>
          </label>

          {/* CB 3 */}
          <label className="flex items-start gap-3 p-4 rounded-xl bg-slate-50 hover:bg-slate-100 cursor-pointer border border-slate-200/60 select-none transition-colors">
            <input
              type="checkbox"
              checked={checkedEpiAware}
              onChange={(e) => setCheckedEpiAware(e.target.checked)}
              className="mt-1 h-4 w-4 text-orange-500 focus:ring-orange-500 focus:ring-offset-0 rounded border-slate-350 cursor-pointer accent-orange-500"
            />
            <div className="text-xs sm:text-sm">
              <span className="font-bold text-slate-800 block">Estou ciente da obrigatoriedade dos EPIs</span>
              <span className="text-slate-500 text-[11px]">Sei que capacete, botina fechada e colete de alta visibilidade são indispensáveis.</span>
            </div>
          </label>

          {/* CB 4 */}
          <label className="flex items-start gap-3 p-4 rounded-xl bg-slate-50 hover:bg-slate-100 cursor-pointer border border-slate-200/60 select-none transition-colors">
            <input
              type="checkbox"
              checked={checkedTerms}
              onChange={(e) => setCheckedTerms(e.target.checked)}
              className="mt-1 h-4 w-4 text-orange-500 focus:ring-orange-500 focus:ring-offset-0 rounded border-slate-350 cursor-pointer accent-orange-500"
            />
            <div className="text-xs sm:text-sm">
              <span className="font-bold text-slate-800 block">Concordo em seguir as normas de segurança</span>
              <span className="text-slate-500 text-[11px]">Comprometo-me em atender às recomendações da Wilson Sons em todo o trajeto.</span>
            </div>
          </label>

        </div>

        {/* Continue Button */}
        <div className="pt-4 text-center">
          {allChecked ? (
            <button
              onClick={handleSubmit}
              className="w-full sm:w-auto px-8 py-4 bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-base rounded-xl transition-all duration-300 hover:scale-101 active:scale-98 flex items-center justify-center gap-2 mx-auto shadow-md"
            >
              <ShieldCheck className="h-5 w-5 animate-pulse" />
              <span>Acessar Código de Agendamento da Visita</span>
            </button>
          ) : (
            <div className="max-w-md mx-auto p-4 bg-red-50 rounded-xl border border-red-200 text-xs sm:text-sm text-red-700 font-semibold shadow-xs">
              Acesso Restrito: Marque todas as 4 declarações obrigatórias estruturadas acima para declarar concordância e desbloquear o formulário de visitas.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
