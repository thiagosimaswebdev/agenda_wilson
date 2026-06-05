import React, { useState } from "react";
import { Ship, ShieldCheck, Mail, Phone, User, Building, MapPin, Users, Calendar, FileText, Send, CheckCircle2, ArrowLeft, Lock } from "lucide-react";
import { VisitRequest, VisitStatus } from "../types";

interface StepFormProps {
  onAddRequest: (request: Omit<VisitRequest, "id" | "submissionDate" | "status" | "securityCleared" | "securityConsentDate">) => void;
  onBackToSafety: () => void;
  securityCleared: boolean;
  onResetSecurity?: () => void;
  isAdminAuthenticated?: boolean;
}

export function StepForm({ onAddRequest, onBackToSafety, securityCleared, onResetSecurity, isAdminAuthenticated }: StepFormProps) {
  // Form Fields State
  const [fullName, setFullName] = useState("");
  const [cpf, setCpf] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [organization, setOrganization] = useState("");
  const [cityState, setCityState] = useState("");
  const [visitorCount, setVisitorCount] = useState<number>(1);
  const [scheduledDate, setScheduledDate] = useState("");
  const [purpose, setPurpose] = useState("");

  const [submittedRequest, setSubmittedRequest] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Simple Auto-Format for CPF: 000.000.000-00
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
    setCpf(value);
  };

  // Simple Auto-Format for Phone: (00) 00000-0000
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 11) value = value.slice(0, 11);
    
    if (value.length > 10) {
      value = `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7)}`;
    } else if (value.length > 6) {
      value = `(${value.slice(0, 2)}) ${value.slice(2, 6)}-${value.slice(6)}`;
    } else if (value.length > 2) {
      value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
    } else if (value.length > 0) {
      value = `(${value}`;
    }
    setPhone(value);
  };

  const handleIntegratedSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!securityCleared) {
      setErrorMsg("Você precisa concluir a Etapa de Segurança obrigatória antes de enviar solicitações.");
      return;
    }

    if (!fullName || !cpf || !email || !phone || !organization || !cityState || !scheduledDate || !purpose) {
      setErrorMsg("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    setIsAnalyzing(true);
    let aiSuggestions = "";

    try {
      // 1. Core AI Objective Analysis
      const response = await fetch("/api/analyze-objective", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purpose,
          visitorCount: Number(visitorCount),
          scheduledDate,
          fullName,
          organization
        }),
      });

      if (response.ok) {
        const data = await response.json();
        aiSuggestions = data.suggestions || "";
      } else {
        console.warn("AI endpoint returned error code, proceeding with request without suggestions");
      }

      // 2. Direct Sync to user's Google Forms Database
      const syncResponse = await fetch("/api/submit-to-google-form", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          cpf,
          email,
          phone,
          organization,
          cityState,
          visitorCount: Number(visitorCount),
          scheduledDate,
          purpose
        })
      });

      if (!syncResponse.ok) {
        const errorData = await syncResponse.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || `Erro de rede do servidor (Status: ${syncResponse.status})`);
      }

      const syncResult = await syncResponse.json();
      if (!syncResult.success) {
        throw new Error(syncResult.message || syncResult.error || "A sincronização direta com o Google Forms foi recusada.");
      }

      // Call callback to add request with computed AI recommendations included
      onAddRequest({
        fullName,
        cpf,
        email,
        phone,
        organization,
        cityState,
        visitorCount: Number(visitorCount),
        scheduledDate,
        purpose,
        aiSuggestions: aiSuggestions || undefined
      });

      setSubmittedRequest(true);

    } catch (err: any) {
      console.error("Error integrating with Google Forms backend:", err);
      setErrorMsg(err.message || "Houve uma falha na integração com o lote do Google Forms. Por favor, tente novamente ou verifique as configurações de mapeamento de chaves no painel Administrativo.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetForm = () => {
    setFullName("");
    setCpf("");
    setEmail("");
    setPhone("");
    setOrganization("");
    setCityState("");
    setVisitorCount(1);
    setScheduledDate("");
    setPurpose("");
    setSubmittedRequest(false);
    if (onResetSecurity) {
      onResetSecurity();
    }
    onBackToSafety();
  };

  if (!securityCleared && !isAdminAuthenticated) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center space-y-6 animate-fade-in">
        <div className="bg-red-50 border border-red-200/80 p-8 rounded-2xl shadow-sm space-y-4">
          <Lock className="h-16 w-16 text-orange-500 mx-auto animate-pulse" />
          <h2 className="font-display text-2xl font-bold text-red-800">Etapa de Segurança Pendente</h2>
          <p className="text-slate-600 text-sm">
            Para solicitar uma visita às instalações portuárias ou ao estaleiro da Wilson Sons, você deve obrigatoriamente assistir e validar o vídeo de conscientização de EPI e aceitar as normas de segurança.
          </p>
          <div className="pt-4">
            <button
              onClick={onBackToSafety}
              className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg shadow-sm transition-transform hover:scale-102 flex items-center justify-center gap-2 mx-auto"
            >
              <ArrowLeft className="h-4 w-4" />
              Preencher Declaração de Segurança
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isAnalyzing) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center space-y-6 animate-fade-in">
        <div className="bg-white border border-slate-200 p-10 sm:p-12 rounded-2xl shadow-md space-y-6 flex flex-col items-center">
          <div className="relative flex items-center justify-center">
            <div className="w-20 h-20 border-4 border-slate-100 border-t-orange-500 rounded-full animate-spin"></div>
            <Ship className="h-8 w-8 text-[#003366] absolute animate-bounce" />
          </div>
          <div className="space-y-2">
            <h3 className="font-display text-xl font-extrabold text-[#003366]">
              Wilson Sons Core IA Ativa
            </h3>
            <p className="text-slate-400 text-xs font-mono tracking-wider uppercase font-semibold">
              Analisando Objetivo &amp; Roteamento Inteligente
            </p>
          </div>
          <div className="bg-slate-50 border border-slate-155 p-4 rounded-xl text-left text-xs text-slate-600 max-w-md w-full space-y-2.5">
            <p className="flex items-center gap-1.5 font-bold text-orange-600 text-[10px] uppercase font-mono">
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping"></span>
              Prompt de IA: Processando Objetivo de Visita
            </p>
            <div className="text-slate-650 italic font-medium leading-relaxed bg-white border border-slate-100 p-2.5 rounded-lg text-[11px]">
              "{purpose.length > 100 ? purpose.slice(0, 100) + "..." : purpose}"
            </div>
            <ul className="space-y-1.5 list-disc pl-4 text-[10px] text-slate-500 leading-normal">
              <li>Mapeando pontos de interesse nos Estaleiros e CAM Wilson Sons</li>
              <li>Recomendando janelas de calado de maré e turnos de menor pico</li>
              <li>Calculando regulamentos adicionais de EPI da segurança do trabalho</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 space-y-8 animate-fade-in">
      {/* Step Indicator and Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <span className="text-orange-600 font-mono text-xs font-bold uppercase tracking-wider block mb-1">
            ETAPA 3 – FORMULÁRIO DE AGENDAMENTO
          </span>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#003366]">
            Solicitação integrada com Google Sheets
          </h1>
        </div>
      </div>

      {submittedRequest ? (
        /* Submission success banner */
        <div className="bg-white border border-slate-200 p-8 sm:p-12 rounded-2xl text-center space-y-6 shadow-md">
          <div className="w-16 h-16 bg-emerald-50 border border-emerald-250 rounded-full flex items-center justify-center mx-auto text-emerald-600">
            <CheckCircle2 className="h-10 w-10 animate-bounce" />
          </div>
          
          <div className="space-y-2">
            <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-[#003366]">
              Solicitação Enviada com Sucesso!
            </h2>
            <p className="text-slate-600 text-sm max-w-lg mx-auto">
              Sua solicitação de visita institucional Wilson Sons foi registrada com sucesso tanto no painel quanto na sua **planilha vinculada do Google Sheets** através do formulário integrado.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-left text-xs text-slate-650 max-w-xl mx-auto space-y-2">
            <div className="flex items-center gap-1.5 font-bold font-mono text-orange-600 uppercase text-[10px]">
              <Ship className="h-3 w-3" />
              INTEGRAÇÃO ATIVA COM GOOGLE FORMS E GOOGLE SHEETS
            </div>
            <p>
              <strong>Notificação Automática:</strong> Suas respostas foram direcionadas para a planilha em tempo real. Um e-mail de pré-confirmação contendo as exigências de EPIs foi enviado para <strong>{email}</strong> de forma automática.
            </p>
            <p>
              A equipe de engenharia e segurança operacional (SESMT) da Wilson Sons analisará sua proposta e emitirá o feedback de aprovação contendo a credencial definitiva.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <button
              onClick={resetForm}
              className="px-6 py-3 bg-[#003366] hover:bg-[#002244] text-white text-sm font-semibold rounded-lg transition-colors"
            >
              Voltar e Cadastrar Outra Solicitação
            </button>
          </div>
        </div>
      ) : (
        /* Integrated Form Fields */
        <form onSubmit={handleIntegratedSubmit} className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">
          
          <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-250 py-2.5 px-4 rounded-xl font-semibold">
            <ShieldCheck className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
            <span>Etapa de Segurança Validada: Normas de Conduta e EPIs obrigatórios assinados com sucesso.</span>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-sm text-red-700 rounded-xl font-semibold">
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Full Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5" htmlFor="fullName">
                <User className="h-3.5 w-3.5 text-slate-500" />
                Nome Completo *
              </label>
              <input
                id="fullName"
                type="text"
                required
                placeholder="Seu nome completo"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:bg-white transition-all font-medium"
              />
            </div>

            {/* CPF */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5" htmlFor="cpf">
                <User className="h-3.5 w-3.5 text-slate-500" />
                CPF *
              </label>
              <input
                id="cpf"
                type="text"
                required
                placeholder="000.000.000-00"
                value={cpf}
                onChange={handleCpfChange}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:bg-white transition-all font-mono font-medium"
              />
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5" htmlFor="email">
                <Mail className="h-3.5 w-3.5 text-slate-500" />
                Email corporativo/pessoal *
              </label>
              <input
                id="email"
                type="email"
                required
                placeholder="exemplo@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:bg-white transition-all font-medium"
              />
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5" htmlFor="phone">
                <Phone className="h-3.5 w-3.5 text-slate-500" />
                Telefone / WhatsApp *
              </label>
              <input
                id="phone"
                type="text"
                required
                placeholder="(00) 00000-0000"
                value={phone}
                onChange={handlePhoneChange}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:bg-white transition-all font-mono font-medium"
              />
            </div>

            {/* Organization */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5" htmlFor="organization">
                <Building className="h-3.5 w-3.5 text-slate-500" />
                Instituição ou Empresa representada *
              </label>
              <input
                id="organization"
                type="text"
                required
                placeholder="Ex: UFRJ, Logística S.A."
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:bg-white transition-all font-medium"
              />
            </div>

            {/* City & State */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5" htmlFor="cityState">
                <MapPin className="h-3.5 w-3.5 text-slate-500" />
                Cidade e Estado de Origem *
              </label>
              <input
                id="cityState"
                type="text"
                required
                placeholder="Ex: Rio de Janeiro - RJ"
                value={cityState}
                onChange={(e) => setCityState(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:bg-white transition-all font-medium"
              />
            </div>

            {/* Visitor Count */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5" htmlFor="visitorCount">
                <Users className="h-3.5 w-3.5 text-slate-500" />
                Quantidade de Visitantes *
              </label>
              <input
                id="visitorCount"
                type="number"
                min="1"
                max="100"
                required
                value={visitorCount}
                onChange={(e) => setVisitorCount(Number(e.target.value))}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:bg-white transition-all font-medium"
              />
            </div>

            {/* Scheduled Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5" htmlFor="scheduledDate">
                <Calendar className="h-3.5 w-3.5 text-slate-500" />
                Data Desejada para Visita *
              </label>
              <input
                id="scheduledDate"
                type="date"
                required
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-hidden focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:bg-white transition-all font-mono font-medium"
              />
            </div>

          </div>

          {/* Purpose */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5" htmlFor="purpose">
              <FileText className="h-3.5 w-3.5 text-slate-500" />
              Objetivo detalhado da visita *
            </label>
            <textarea
              id="purpose"
              rows={4}
              required
              placeholder="Explique o intuito de sua visita (Ex: Visita técnica com 10 estudantes do 5º período do curso de Operações, visita operacional para conferência de containeres, etc.)"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:bg-white transition-all resize-none font-medium"
            />
          </div>

          {/* Consent checklist display */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500 font-medium">
            <p>
              Os dados correspondentes acima estão protegidos em conformidade com a LGPD e compartilhados diretamente com as bases do Google Forms para preencher sua planilha cadastrada em tempo real.
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-4 items-center justify-between pt-2">
            <button
              type="button"
              onClick={onBackToSafety}
              className="text-slate-500 hover:text-slate-800 transition-colors text-xs font-semibold flex items-center gap-1.5"
            >
              <ArrowLeft className="h-4 w-4" />
              Rever Regras de Segurança
            </button>

            <button
              type="submit"
              className="px-6 py-3.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-md hover:scale-[1.01]"
            >
              <Send className="h-4 w-4" />
              <span>Enviar Solicitação Integrada</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
