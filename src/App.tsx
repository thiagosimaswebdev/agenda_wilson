import React, { useState, useEffect } from "react";
import { Header } from "./components/Header";
import { StepHome } from "./components/StepHome";
import { StepSafety } from "./components/StepSafety";
import { StepForm } from "./components/StepForm";
import { AdminPanel } from "./components/AdminPanel";
import { Footer } from "./components/Footer";
import { VisitRequest, VisitStatus, FeedbackResponse, MailLog } from "./types";
import { getStoredRequests, saveStoredRequests, INITIAL_MOCK_REQUESTS, getStoredFeedbacks, saveStoredFeedbacks, INITIAL_MOCK_FEEDBACKS } from "./utils/mockData";
import { ShieldCheck, Anchor, Ship, AlertCircle } from "lucide-react";

export default function App() {
  const [currentTab, setTab] = useState<string>("home");
  
  // Custom non-blocking Toast state to replace annoying browser alert() popups
  const [toast, setToast] = useState<{ message: string; type: "success" | "info" | "error" } | null>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  
  // Security cleared status (starts as false so user always reviews safety)
  const [securityCleared, setSecurityCleared] = useState<boolean>(false);

  // Admin authentication state lifted up for cross-tab capability
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem("wilson_sons_admin_authenticated") === "true";
  });

  useEffect(() => {
    localStorage.setItem("wilson_sons_admin_authenticated", isAdminAuthenticated ? "true" : "false");
  }, [isAdminAuthenticated]);

  // Load initial simulated spreadsheet database
  const [requests, setRequests] = useState<VisitRequest[]>(() => {
    return getStoredRequests();
  });

  // Load initial feedback responses
  const [feedbacks, setFeedbacks] = useState<FeedbackResponse[]>(() => {
    return getStoredFeedbacks();
  });

  // Simulated SMTP server mailbox logs
  const [mailLogs, setMailLogs] = useState<MailLog[]>(() => {
    const stored = localStorage.getItem("wilson_sons_mail_logs");
    if (!stored) {
      const initialLogs: MailLog[] = [
        {
          id: "ML-001",
          to: "marcos.silveira@portoaustral.com",
          subject: "🏆 Credencial de Acesso Wilson Sons Liberada - Marcos Aurélio Silveira",
          date: "2026-05-01 11:20",
          type: "approval",
          body: "Olá Marcos Aurélio Silveira,\n\nSua credencial de acesso ao pátio operacional Wilson Sons foi devidamente autorizada pelo SESMT!\n\nAnexo a este e-mail, você recebeu o seu Crachá Virtual de Acesso. Ele acompanha o seu ID WS-REQ-000 e um QR Code correspondente.\n\nPor favor, imprima o crachá em tamanho real (85mm de largura por 135mm de altura) e utilize com um cordão de pescoço durante toda a permanência nas docas.\n\nBons negócios!\nSESMT Wilson Sons",
          request: INITIAL_MOCK_REQUESTS[0]
        },
        {
          id: "ML-002",
          to: "carlos.silva@navalcorp.com.br",
          subject: "🏆 Credencial de Acesso Wilson Sons Liberada - Carlos Eduardo Santos Silva",
          date: "2026-05-28 15:40",
          type: "approval",
          body: "Olá Carlos Eduardo Santos Silva,\n\nSua credencial de acesso ao pátio operacional Wilson Sons foi devidamente autorizada pelo SESMT!\n\nAnexo a este e-mail, você recebeu o seu Crachá Virtual de Acesso. Ele acompanha o seu ID WS-REQ-001 e um QR Code correspondente.\n\nPor favor, imprima o crachá em tamanho real (85mm de largura por 135mm de altura) e utilize com um cordão de pescoço durante toda a permanência nas docas.\n\nBons negócios!\nSESMT Wilson Sons",
          request: INITIAL_MOCK_REQUESTS[1]
        }
      ];
      try {
        localStorage.setItem("wilson_sons_mail_logs", JSON.stringify(initialLogs));
      } catch (e) {
        console.warn("Falha ao inicializar wilson_sons_mail_logs no localStorage:", e);
      }
      return initialLogs;
    }
    try {
      return JSON.parse(stored);
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    try {
      // Keep only the 10 most recent logs, and strip visitor photos from logs request reference to fit within browser's 5MB quota
      const sanitizedLogs = mailLogs.slice(0, 10).map((log) => ({
        ...log,
        request: log.request 
          ? { ...log.request, visitorPhoto: "" } 
          : undefined
      }));
      localStorage.setItem("wilson_sons_mail_logs", JSON.stringify(sanitizedLogs));
    } catch (e) {
      console.warn("Cota de localStorage excedida ao salvar mail_logs. Limpando logs:", e);
    }
  }, [mailLogs]);

  // Synchronize database updates to localStorage
  useEffect(() => {
    saveStoredRequests(requests);
  }, [requests]);

  // Synchronize feedback updates to localStorage
  useEffect(() => {
    saveStoredFeedbacks(feedbacks);
  }, [feedbacks]);

  // Background feedback automation trigger:
  // If an approved visit has passed its date, automatically trigger a feedback email dispatch!
  useEffect(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    let updated = false;
    
    const updatedRequests = requests.map((r) => {
      // Check if approved, date is in the past, and feedback was not sent
      if (r.status === VisitStatus.APPROVED && r.scheduledDate < todayStr && !r.feedbackSent) {
        updated = true;
        return {
          ...r,
          feedbackSent: true,
          feedbackSentDate: new Date().toISOString().slice(0, 16).replace("T", " ")
        };
      }
      return r;
    });

    if (updated) {
      setRequests(updatedRequests);
    }
  }, [requests]);

  // Create solicitation in database
  const handleAddRequest = (newFields: Omit<VisitRequest, "id" | "submissionDate" | "status" | "securityCleared" | "securityConsentDate">) => {
    const nextIdNumber = requests.length + 1;
    const formattedId = `WS-REQ-${String(nextIdNumber).padStart(3, "0")}`;
    
    const request: VisitRequest = {
      ...newFields,
      id: formattedId,
      status: VisitStatus.PENDING,
      submissionDate: new Date().toISOString().slice(0, 10),
      securityCleared: true,
      securityConsentDate: new Date().toISOString()
    };

    setRequests((prev) => [request, ...prev]);
  };

  // Alter status of solicitation (e.g. approve, reject with reason)
  const handleChangeStatus = async (id: string, nextStatus: VisitStatus, rejectionReason?: string) => {
    // Find the request immediately
    const match = requests.find((r) => r.id === id);
    if (!match) return;

    // First, update requests state
    setRequests((prev) => 
      prev.map((r) => {
        if (r.id === id) {
          return {
            ...r,
            status: nextStatus,
            rejectionReason: rejectionReason || r.rejectionReason
          };
        }
        return r;
      })
    );

    // Prepare request object with updated status for mailing
    const updatedRequest = {
      ...match,
      status: nextStatus,
      rejectionReason: rejectionReason || match.rejectionReason
    };

    try {
      const response = await fetch("/api/send-status-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          request: updatedRequest,
          status: nextStatus,
          rejectionReason: rejectionReason
        })
      });

      let data;
      if (!response.ok) {
        let errorMsg = "Falha ao comunicar com o servidor de envio de e-mails.";
        try {
          const contentType = response.headers.get("content-type") || "";
          if (contentType.includes("application/json")) {
            const errData = await response.json();
            errorMsg = errData.error || errData.message || errorMsg;
          }
        } catch (e) {}
        throw new Error(errorMsg);
      } else {
        data = await response.json();
      }

      if (data.success) {
        if (data.mailLog) {
          // If the server provides an actual HTML/Text log, save it
          setMailLogs((prevMails) => [data.mailLog, ...prevMails]);
        }
        
        // Notify user about delivery success using smooth toasts instead of blocking alerts
        if (data.smtpConfigured && !data.smtpError) {
          setToast({
            type: "success",
            message: `E-mail Real Enviado com Sucesso!\n\n${data.message}`
          });
        } else {
          setToast({
            type: "info",
            message: `Notificação registrada!\n\n${data.message}`
          });
        }
      } else {
        setToast({
          type: "error",
          message: `Erro no envio integrado do e-mail: ${data.error}`
        });
      }
    } catch (err: any) {
      console.error("Transmission Error:", err);
      setToast({
        type: "error",
        message: `Erro ao despachar credencial para o servidor de e-mail: ${err.message}`
      });
    }
  };

  // Delete solicitation row
  const handleDeleteRequest = (id: string) => {
    setRequests((prev) => prev.filter((r) => r.id !== id));
  };

  // Reset database back to default list
  const handleResetDatabase = () => {
    if (confirm("Isto irá restaurar a planilha do Google Sheets de amostra original com as 4 solicitações mockadas da Wilson Sons. Continuar?")) {
      setRequests(INITIAL_MOCK_REQUESTS);
    }
  };

  const handleClearedSecurity = () => {
    setSecurityCleared(true);
    // Directly guide user to step 3 (form) after clearing security!
    setTab("form");
  };

  const handleStartRequest = () => {
    setSecurityCleared(false);
    setTab("safety");
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-800 font-sans print:bg-white print:text-black">
      
      {/* Header component with Tab management and Security Lock information */}
      <Header 
        currentTab={currentTab} 
        setTab={setTab} 
        securityCleared={securityCleared}
        onOpenAdminAuth={() => setTab("admin")}
        isAdminAuthenticated={isAdminAuthenticated}
      />

      {/* Main Container */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-6 md:py-10 print:p-0 print:max-w-full print:m-0">
        
        {/* Dynamic header summary based on stage of enrollment */}
        {currentTab !== "admin" && currentTab !== "manual" && (
          <div className="mb-8 p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-[#00AED6]/10 border border-[#00AED6]/20 rounded-lg text-[#003366]">
                <Ship className="h-5 w-5 animate-pulse text-[#00AED6]" />
              </div>
              <div>
                <h2 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest">
                  Processo Guiado Wilson Sons
                </h2>
                <div className="flex items-center gap-1.5 font-display text-sm font-bold text-[#003366]">
                  <span>Fluxo Integrado de Credenciamento Corporativo</span>
                </div>
              </div>
            </div>

            {/* Steps breadcrumb indicator on top using Navy/Cyan contrast */}
            <div className="flex items-center gap-1.5 font-mono text-[10px] sm:text-xs">
              <span className={`px-3 py-1 rounded-full font-medium transition-colors ${currentTab === "home" ? "bg-[#003366] text-white font-bold border border-[#003366] shadow-xs" : "bg-slate-100 text-slate-500 border border-slate-200"}`}>
                1. Início
              </span>
              <span className="text-[#00AED6] font-bold">→</span>
              <span className={`px-3 py-1 rounded-full font-medium transition-colors ${currentTab === "safety" ? "bg-[#003366] text-white font-bold border border-[#003366] shadow-xs" : securityCleared ? "bg-emerald-50 text-emerald-700 border border-emerald-250 font-semibold" : "bg-slate-100 text-slate-500 border border-slate-200"}`}>
                2. Segurança {securityCleared ? "✓" : ""}
              </span>
              <span className="text-[#00AED6] font-bold">→</span>
              <span className={`px-3 py-1 rounded-full font-medium transition-colors ${currentTab === "form" ? "bg-[#003366] text-white font-bold border border-[#003366] shadow-xs" : "bg-slate-100 text-slate-500 border border-slate-200"}`}>
                3. Formulário
              </span>
            </div>
          </div>
        )}

        {/* Displaying active components based on tab state */}
        <div className="animate-fade-in">
          {currentTab === "home" && (
            <StepHome onStartRequest={handleStartRequest} requests={requests} />
          )}

          {currentTab === "safety" && (
            <StepSafety 
              onClearedSecurity={handleClearedSecurity} 
              securityCleared={securityCleared}
            />
          )}

          {currentTab === "form" && (
            <StepForm 
              onAddRequest={handleAddRequest} 
              onBackToSafety={() => setTab("safety")}
              securityCleared={securityCleared}
              onResetSecurity={() => setSecurityCleared(false)}
              isAdminAuthenticated={isAdminAuthenticated}
            />
          )}

          {currentTab === "admin" && (
            <AdminPanel 
              requests={requests}
              onChangeStatus={handleChangeStatus}
              onDeleteRequest={handleDeleteRequest}
              onResetDatabase={handleResetDatabase}
              feedbacks={feedbacks}
              setFeedbacks={setFeedbacks}
              setRequests={setRequests}
              mailLogs={mailLogs}
              setMailLogs={setMailLogs}
              isAuthenticated={isAdminAuthenticated}
              setIsAuthenticated={setIsAdminAuthenticated}
            />
          )}
        </div>
      </main>

      {/* Modern custom toast notification system */}
      {toast && (
        <div key={toast.message} className={`fixed bottom-6 right-6 z-[99999] p-4 rounded-xl shadow-2xl border text-xs max-w-sm animate-fade-in flex items-start gap-3 transition-all text-left ${
          toast.type === "success" 
            ? "bg-emerald-50 border-emerald-300 text-emerald-950" 
            : toast.type === "error"
            ? "bg-rose-50 border-rose-300 text-rose-950"
            : "bg-amber-50 border-amber-300 text-amber-950"
        }`}>
          <span className="text-base shrink-0 select-none">
            {toast.type === "success" ? "✅" : toast.type === "error" ? "⚠️" : "ℹ️"}
          </span>
          <div className="flex-1 space-y-1">
            <div className="font-extrabold uppercase tracking-wider text-[10px] text-slate-500">Notificação SESMT</div>
            <p className="font-semibold whitespace-pre-line leading-relaxed">{toast.message}</p>
          </div>
          <button 
            type="button" 
            onClick={() => setToast(null)} 
            className="text-slate-400 hover:text-slate-700 font-extrabold ml-1 text-sm select-none cursor-pointer p-0.5"
          >
            ×
          </button>
        </div>
      )}

      {/* Mandatory Corporate Footer including the Academy credit */}
      <Footer />
    </div>
  );
}
