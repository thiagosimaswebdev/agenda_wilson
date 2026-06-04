import React, { useState, useEffect } from "react";
import { Header } from "./components/Header";
import { StepHome } from "./components/StepHome";
import { StepSafety } from "./components/StepSafety";
import { StepForm } from "./components/StepForm";
import { AdminPanel } from "./components/AdminPanel";
import { Footer } from "./components/Footer";
import { VisitRequest, VisitStatus, FeedbackResponse } from "./types";
import { getStoredRequests, saveStoredRequests, INITIAL_MOCK_REQUESTS, getStoredFeedbacks, saveStoredFeedbacks, INITIAL_MOCK_FEEDBACKS } from "./utils/mockData";
import { ShieldCheck, Anchor, Ship, AlertCircle } from "lucide-react";

export default function App() {
  const [currentTab, setTab] = useState<string>("home");
  
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
  const handleChangeStatus = (id: string, nextStatus: VisitStatus, rejectionReason?: string) => {
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
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-800 font-sans">
      
      {/* Header component with Tab management and Security Lock information */}
      <Header 
        currentTab={currentTab} 
        setTab={setTab} 
        securityCleared={securityCleared}
        onOpenAdminAuth={() => setTab("admin")}
        isAdminAuthenticated={isAdminAuthenticated}
      />

      {/* Main Container */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-6 md:py-10">
        
        {/* Dynamic header summary based on stage of enrollment */}
        {currentTab !== "admin" && (
          <div className="mb-8 p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-orange-500/10 border border-orange-500/20 rounded-lg text-orange-600">
                <Ship className="h-5 w-5 animate-pulse text-orange-500" />
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

            {/* Steps breadcrumb indicator on top */}
            <div className="flex items-center gap-1.5 font-mono text-[10px] sm:text-xs">
              <span className={`px-3 py-1 rounded-full font-medium transition-colors ${currentTab === "home" ? "bg-orange-500 text-white font-bold shadow-xs" : "bg-slate-100 text-slate-600 border border-slate-200"}`}>
                1. Início
              </span>
              <span className="text-slate-300">→</span>
              <span className={`px-3 py-1 rounded-full font-medium transition-colors ${currentTab === "safety" ? "bg-orange-500 text-white font-bold shadow-xs" : securityCleared ? "bg-emerald-50 text-emerald-700 border border-emerald-250 font-semibold" : "bg-slate-100 text-slate-600 border border-slate-200"}`}>
                2. Segurança {securityCleared ? "✓" : ""}
              </span>
              <span className="text-slate-300">→</span>
              <span className={`px-3 py-1 rounded-full font-medium transition-colors ${currentTab === "form" ? "bg-orange-500 text-white font-bold shadow-xs" : "bg-slate-100 text-slate-600 border border-slate-200"}`}>
                3. Formulário
              </span>
            </div>
          </div>
        )}

        {/* Displaying active components based on tab state */}
        <div className="animate-fade-in">
          {currentTab === "home" && (
            <StepHome onStartRequest={handleStartRequest} />
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
              isAuthenticated={isAdminAuthenticated}
              setIsAuthenticated={setIsAdminAuthenticated}
            />
          )}
        </div>
      </main>

      {/* Mandatory Corporate Footer including the Academy credit */}
      <Footer />
    </div>
  );
}
