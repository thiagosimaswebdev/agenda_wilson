import React, { useState } from "react";
import { Ship, ShieldCheck, Mail, Phone, User, Building, MapPin, Users, Calendar, FileText, Send, CheckCircle2, ArrowLeft, Lock, Camera, Upload } from "lucide-react";
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

  // Camera & Portrait Photo Capture State
  const [visitorPhoto, setVisitorPhoto] = useState<string>("");
  const [showWebcam, setShowWebcam] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 325, height: 260, facingMode: "user" }
      });
      setCameraStream(stream);
      setShowWebcam(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (err: any) {
      console.error("Camera access error:", err);
      alert("Não foi possível acessar a câmera do dispositivo. Por favor, faça o upload de uma foto do seu computador.");
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setShowWebcam(false);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = 300;
      canvas.height = 360;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/png");
        setVisitorPhoto(dataUrl);
        stopCamera();
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const rawResult = reader.result as string;
        
        // Compress the uploaded image to ensure a lightweight base64 payload (<50KB)
        // to prevent 413 Payload Too Large / Nginx proxy blocks under Cloud Run.
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          // target size for visitor card photo: 300x360 px
          canvas.width = 300;
          canvas.height = 360;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            // center crop & cover
            const scale = Math.max(canvas.width / img.width, canvas.height / img.height);
            const x = (canvas.width / 2) - (img.width / 2) * scale;
            const y = (canvas.height / 2) - (img.height / 2) * scale;
            
            // Draw
            ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
            
            // Get compressed jpeg data URL (0.7 quality)
            const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.7);
            setVisitorPhoto(compressedDataUrl);
          } else {
            // Fallback to raw if canvas ctx is unavailable
            setVisitorPhoto(rawResult);
          }
        };
        img.onerror = () => {
          // Fallback to raw if it's not a valid format
          setVisitorPhoto(rawResult);
        };
        img.src = rawResult;
      };
      reader.readAsDataURL(file);
    }
  };

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

    const getSafeJson = async (res: Response, endpoint: string) => {
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error(`O servidor retornou uma página de erro (HTML) em vez de dados (JSON) para a rota ${endpoint} (Código: ${res.status}). Por favor, certifique-se de que o backend foi iniciado corretamente.`);
      }
      try {
        return await res.json();
      } catch (e) {
        throw new Error(`Erro ao decodificar a resposta de dados do endpoint ${endpoint}.`);
      }
    };

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
        try {
          const data = await getSafeJson(response, "/api/analyze-objective");
          aiSuggestions = data.suggestions || "";
        } catch (e) {
          console.warn("AI endpoint response could not be parsed safely, proceeding with request without suggestions", e);
        }
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
          purpose,
          visitorPhoto
        })
      });

      let syncResult;
      if (!syncResponse.ok) {
        let errorMsgDetails = `Erro de rede do servidor (Status: ${syncResponse.status})`;
        try {
          const contentType = syncResponse.headers.get("content-type") || "";
          if (contentType.includes("application/json")) {
            const errorData = await syncResponse.json();
            errorMsgDetails = errorData.message || errorData.error || errorMsgDetails;
          }
        } catch (e) {}
        throw new Error(errorMsgDetails);
      } else {
        syncResult = await getSafeJson(syncResponse, "/api/submit-to-google-form");
      }

      if (!syncResult || !syncResult.success) {
        throw new Error(syncResult ? (syncResult.message || syncResult.error) : "A sincronização direta com o Google Forms foi recusada.");
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
        aiSuggestions: aiSuggestions || undefined,
        visitorPhoto: visitorPhoto || undefined
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
          <Lock className="h-16 w-16 text-[#00AED6] mx-auto animate-pulse" />
          <h2 className="font-display text-2xl font-bold text-red-800">Etapa de Segurança Pendente</h2>
          <p className="text-slate-600 text-sm">
            Para solicitar uma visita às instalações portuárias ou ao estaleiro da Wilson Sons, você deve obrigatoriamente assistir e validar o vídeo de conscientização de EPI e aceitar as normas de segurança.
          </p>
          <div className="pt-4">
            <button
              onClick={onBackToSafety}
              className="px-6 py-3 bg-[#003366] hover:bg-[#002244] text-white font-bold rounded-lg shadow-sm transition-transform hover:scale-102 flex items-center justify-center gap-2 mx-auto cursor-pointer"
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
            <div className="w-20 h-20 border-4 border-slate-100 border-t-[#00AED6] rounded-full animate-spin"></div>
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
            <p className="flex items-center gap-1.5 font-bold text-[#003366] text-[10px] uppercase font-mono">
              <span className="w-2 h-2 rounded-full bg-[#00AED6] animate-ping"></span>
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
          <span className="text-[#003366] font-mono text-xs font-bold uppercase tracking-wider block mb-1">
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

          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-left text-xs text-slate-655 max-w-xl mx-auto space-y-2">
            <div className="flex items-center gap-1.5 font-bold font-mono text-[#003366] uppercase text-[10px]">
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
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#00AED6] focus:ring-2 focus:ring-[#00AED6]/20 focus:bg-white transition-all font-medium"
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
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#00AED6] focus:ring-2 focus:ring-[#00AED6]/20 focus:bg-white transition-all font-mono font-medium"
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
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#00AED6] focus:ring-2 focus:ring-[#00AED6]/20 focus:bg-white transition-all font-medium"
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
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#00AED6] focus:ring-2 focus:ring-[#00AED6]/20 focus:bg-white transition-all font-mono font-medium"
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
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#00AED6] focus:ring-2 focus:ring-[#00AED6]/20 focus:bg-white transition-all font-medium"
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
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#00AED6] focus:ring-2 focus:ring-[#00AED6]/20 focus:bg-white transition-all font-medium"
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
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#00AED6] focus:ring-2 focus:ring-[#00AED6]/20 focus:bg-white transition-all font-medium"
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
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-hidden focus:border-[#00AED6] focus:ring-2 focus:ring-[#00AED6]/20 focus:bg-white transition-all font-mono font-medium"
              />
            </div>

          </div>

          {/* Photograph Capture Component section */}
          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
            <div className="space-y-1">
              <h4 className="font-display font-extrabold text-sm text-[#003366] flex items-center gap-1.5">
                <Camera className="h-4 w-4 text-[#00AED6]" />
                Fotografia para Credencial de Acesso (Recomendado)
              </h4>
              <p className="text-slate-500 text-xs">
                Sua foto será impressa na credencial virtual. Você pode tirar uma foto agora ou fazer o upload de um arquivo.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              {/* Photo Input options */}
              <div className="flex flex-col gap-3 justify-center">
                {showWebcam ? (
                  <div className="space-y-2 text-center">
                    <div className="relative bg-[#003366] border border-slate-300 rounded-xl overflow-hidden aspect-5/4 max-w-[280px] mx-auto shadow-sm">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        className="w-full h-full object-cover scale-x-[-1]"
                      />
                    </div>
                    <div className="flex justify-center gap-2">
                      <button
                        type="button"
                        onClick={capturePhoto}
                        className="px-3.5 py-1.5 bg-[#003366] hover:bg-[#002244] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                      >
                        Tirar Foto
                      </button>
                      <button
                        type="button"
                        onClick={stopCamera}
                        className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={startCamera}
                      className="w-full py-2.5 px-4 bg-[#003366]/5 hover:bg-[#003366]/10 border border-[#003366]/15 hover:border-[#003366]/30 text-[#003366] rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Camera className="h-4 w-4" />
                      Capturar com Webcam
                    </button>
                    
                    <div className="relative flex items-center justify-center py-1">
                      <span className="text-[10px] text-slate-400 font-mono font-bold uppercase bg-slate-50 px-2.5 z-10">OU</span>
                      <div className="absolute inset-x-0 h-[1px] bg-slate-200"></div>
                    </div>

                    <label className="w-full py-2.5 px-4 bg-white hover:bg-slate-100 border border-slate-250 text-slate-700 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center">
                      <Upload className="h-4 w-4" />
                      Fazer Upload de Foto
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}
              </div>

              {/* Portrait Preview Box */}
              <div className="flex flex-col items-center justify-center border border-dashed border-slate-250 p-4 rounded-xl min-h-[160px] bg-white">
                {visitorPhoto ? (
                  <div className="text-center space-y-2.5">
                    <div className="relative w-28 h-32 mx-auto bg-slate-100 border-2 border-emerald-500 rounded-lg overflow-hidden shadow-sm">
                      <img
                        src={visitorPhoto}
                        alt="Foto do Agendado"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setVisitorPhoto("")}
                      className="text-red-500 hover:text-red-650 font-semibold text-xs transition-colors cursor-pointer block mx-auto"
                    >
                      Remover foto
                    </button>
                  </div>
                ) : (
                  <div className="text-center text-slate-400 space-y-1">
                    <User className="h-10 w-10 mx-auto text-slate-300" />
                    <p className="text-xs font-bold uppercase font-mono text-slate-500 leading-snug">Foto Pendente</p>
                    <p className="text-[10px] text-slate-400">Nenhuma foto salva ainda</p>
                  </div>
                )}
              </div>
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
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#00AED6] focus:ring-2 focus:ring-[#00AED6]/20 focus:bg-white transition-all resize-none font-medium"
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
              className="px-6 py-3.5 bg-[#003366] hover:bg-[#002244] text-white text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-md hover:scale-[1.01] cursor-pointer"
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
