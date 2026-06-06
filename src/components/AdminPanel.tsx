import React, { useState, useEffect } from "react";
import { VisitRequest, VisitStatus, FeedbackResponse, DashboardStats, MailLog } from "../types";
import { VirtualBadge } from "./VirtualBadge";
import { 
  Building, 
  Calendar, 
  CheckCircle, 
  XCircle, 
  Clock, 
  FileSpreadsheet, 
  Download, 
  Filter, 
  Search, 
  ShieldAlert, 
  Trash2, 
  Lock, 
  KeyRound, 
  Eye, 
  User, 
  Users,
  Phone, 
  Mail, 
  MapPin, 
  ChevronLeft,
  ChevronRight, 
  RotateCcw,
  BookOpen,
  CodeXml,
  Copy,
  Plus,
  Star,
  MessageSquare,
  Sparkles,
  Send,
  ExternalLink,
  QrCode,
  Camera
} from "lucide-react";

interface AdminPanelProps {
  requests: VisitRequest[];
  onChangeStatus: (id: string, nextStatus: VisitStatus, rejectionReason?: string) => void;
  onDeleteRequest: (id: string) => void;
  onResetDatabase: () => void;
  feedbacks: FeedbackResponse[];
  setFeedbacks: React.Dispatch<React.SetStateAction<FeedbackResponse[]>>;
  setRequests: React.Dispatch<React.SetStateAction<VisitRequest[]>>;
  mailLogs: MailLog[];
  setMailLogs: React.Dispatch<React.SetStateAction<MailLog[]>>;
  isAuthenticated: boolean;
  setIsAuthenticated: (val: boolean) => void;
}

export function AdminPanel({ 
  requests, 
  onChangeStatus, 
  onDeleteRequest, 
  onResetDatabase,
  feedbacks,
  setFeedbacks,
  setRequests,
  mailLogs,
  setMailLogs,
  isAuthenticated,
  setIsAuthenticated
}: AdminPanelProps) {
  // Authentication State
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");

  // Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [orgFilter, setOrgFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Reset page to 1 when filters actioned
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, orgFilter, dateFilter]);

  // Details pop-up state
  const [selectedRequest, setSelectedRequest] = useState<VisitRequest | null>(null);
  const [viewingBadge, setViewingBadge] = useState<VisitRequest | null>(null);
  const [rejectionInput, setRejectionInput] = useState("");
  const [isRejecting, setIsRejecting] = useState(false);

  // Active view tab inside admin
  const [activeAdminTab, setActiveAdminTab] = useState<"solicitations" | "feedbacks" | "automation" | "google_forms" | "gate_validator" | "dispatched_emails">("solicitations");
  const [selectedMailId, setSelectedMailId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"html" | "text">("html");
  const [copiedCode, setCopiedCode] = useState(false);

  // Portaria QR Simulation scan structure
  const [scanResult, setScanResult] = useState<{
    status: "allow" | "deny" | "pending";
    request: VisitRequest;
  } | null>(null);

  const synthesizeBeep = (type: "success" | "failure") => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (!audioCtx) return;

      if (type === "success") {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = "sine";
        osc.frequency.setValueAtTime(1150, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);
        osc.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + 0.15);
      } else {
        const osc1 = audioCtx.createOscillator();
        const gain1 = audioCtx.createGain();
        osc1.connect(gain1);
        gain1.connect(audioCtx.destination);
        osc1.type = "sawtooth";
        osc1.frequency.setValueAtTime(140, audioCtx.currentTime);
        gain1.gain.setValueAtTime(0.09, audioCtx.currentTime);
        gain1.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.18);
        osc1.start(audioCtx.currentTime);
        osc1.stop(audioCtx.currentTime + 0.2);

        setTimeout(() => {
          const osc2 = audioCtx.createOscillator();
          const gain2 = audioCtx.createGain();
          osc2.connect(gain2);
          gain2.connect(audioCtx.destination);
          osc2.type = "sawtooth";
          osc2.frequency.setValueAtTime(140, audioCtx.currentTime);
          gain2.gain.setValueAtTime(0.09, audioCtx.currentTime);
          gain2.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.18);
          osc2.start(audioCtx.currentTime);
          osc2.stop(audioCtx.currentTime + 0.2);
        }, 220);
      }
    } catch (err) {
      console.warn("AudioContext beep simulation blocked by browser sandbox policy or not supported:", err);
    }
  };

  const handleScanValidation = (id: string | null) => {
    if (!id) return;
    const cleanId = id.trim().toUpperCase();
    const match = requests.find(r => r.id.toUpperCase() === cleanId);
    
    if (!match) {
      synthesizeBeep("failure");
      alert(`Erro: QR Code com credencial "${cleanId}" não localizado na planilha sincronizada.`);
      setScanResult(null);
      return;
    }

    if (match.status === VisitStatus.APPROVED) {
      synthesizeBeep("success");
      setScanResult({
        status: "allow",
        request: match
      });
    } else if (match.status === VisitStatus.PENDING) {
      synthesizeBeep("failure");
      setScanResult({
        status: "pending",
        request: match
      });
    } else {
      synthesizeBeep("failure");
      setScanResult({
        status: "deny",
        request: match
      });
    }
  };

  // Dynamic feedback form simulation state
  const [showFeedbackSimulator, setShowFeedbackSimulator] = useState<VisitRequest | null>(null);
  const [feedbackOrgRating, setFeedbackOrgRating] = useState(5);
  const [feedbackSafetyRating, setFeedbackSafetyRating] = useState(5);
  const [feedbackUsefulnessRating, setFeedbackUsefulnessRating] = useState(5);
  const [feedbackComments, setFeedbackComments] = useState("");

  // AI manual on-the-fly request state
  const [isGeneratingAI, setIsGeneratingAI] = useState<string | null>(null);

  // Google Forms customization state
  const [googleFormsUrl, setGoogleFormsUrl] = useState("https://docs.google.com/forms/d/e/1FAIpQLSdha_LdNmV5ooGmcaG0tdOMczd8Xn1EvaOFE-KAri2f_pEezg/viewform");
  const [fieldMappings, setFieldMappings] = useState<Record<string, string>>({
    fullName: "entry.731264085",
    cpf: "entry.1836314584",
    email: "entry.1898895614",
    phone: "entry.1320066586",
    organization: "entry.613409940",
    cityState: "entry.1646761464",
    visitorCount: "entry.1943855474",
    scheduledDate: "entry.666260665",
    purpose: "entry.1129131450"
  });
  
  // Dynamic SMTP configuration
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("587");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPass, setSmtpPass] = useState("");
  const [smtpFrom, setSmtpFrom] = useState("");
  const [isSavingSmtp, setIsSavingSmtp] = useState(false);
  const [isTestingSmtp, setIsTestingSmtp] = useState(false);
  const [smtpTestStatus, setSmtpTestStatus] = useState<{ success: boolean; message: string } | null>(null);
  
  const [isFetchingConfig, setIsFetchingConfig] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [isScrapingForms, setIsScrapingForms] = useState(false);
  const [scrapeError, setScrapeError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [scrapedFields, setScrapedFields] = useState<any[]>([]);
  const [testSubmitStatus, setTestSubmitStatus] = useState<any | null>(null);
  const [isTestSubmitting, setIsTestSubmitting] = useState(false);

  // HTML source pasting for foolproof local processing
  const [pastedHtml, setPastedHtml] = useState("");
  const [pasteParseMessage, setPasteParseMessage] = useState("");
  const [showPasteArea, setShowPasteArea] = useState(true);

  const handleParsePastedHtml = () => {
    if (!pastedHtml.trim()) {
      setPasteParseMessage("Por favor, cole o código HTML antes de clicar para extrair.");
      return;
    }
    
    // Safety check for incomplete page pastes
    if (pastedHtml.length < 15000) {
      setPasteParseMessage(`⚠️ Alerta: O código colado parece estar incompleto (apenas ${pastedHtml.length} caracteres). Clique em qualquer ponto da tela de código-fonte no seu navegador, aperte Ctrl+A (para selecionar tudo) e depois Ctrl+C para garantir a cópia completa.`);
    }

    try {
      const extractedList: any[] = [];
      const suggestedMappings: Record<string, string> = {};
      const foundEntryIds = new Set<string>();

      // Strategy 0: Extract anything matching entry.XXXX/entry_XXXX/entryXXXX in quotes, data attributes, names, etc.
      // E.g., entry.1045781291, name="entry.1045781291", etc. We look for any 7 to 11 digit numbers following 'entry' with or without separation.
      const directEntryRegex = /(?:entry[._]?)(\d{7,11})\b/gi;
      let directMatch;
      while ((directMatch = directEntryRegex.exec(pastedHtml)) !== null) {
        foundEntryIds.add(directMatch[1]);
      }

      // Strategy 1: Extract anything matching entry name tags strictly, e.g. name="entry.1045781291" or similar
      const inputRegex = /name="entry\.(\d+)"/g;
      let match;
      while ((match = inputRegex.exec(pastedHtml)) !== null) {
        foundEntryIds.add(match[1]);
      }

      // Strategy 2: Bracket-balanced FB_PUBLIC_APP_DATA extraction (avoids regex limit on huge chunks and captures accurately)
      let fbAppString = "";
      const fbIdx = pastedHtml.indexOf("FB_PUBLIC_APP_DATA");
      if (fbIdx !== -1) {
        const startBracketIdx = pastedHtml.indexOf("[", fbIdx);
        if (startBracketIdx !== -1) {
          let bracketCount = 0;
          let inString = false;
          let stringChar = '';
          let escaped = false;
          for (let i = startBracketIdx; i < pastedHtml.length; i++) {
            const char = pastedHtml[i];
            if (escaped) {
              escaped = false;
              continue;
            }
            if (char === '\\') {
              escaped = true;
              continue;
            }
            if (inString) {
              if (char === stringChar) {
                inString = false;
              }
              continue;
            }
            if (char === '"' || char === "'") {
              inString = true;
              stringChar = char;
              continue;
            }
            if (char === '[') {
              bracketCount++;
            } else if (char === ']') {
              bracketCount--;
              if (bracketCount === 0) {
                fbAppString = pastedHtml.slice(startBracketIdx, i + 1);
                break;
              }
            }
          }
        }
      }

      // Try parsing FB_PUBLIC_APP_DATA if found
      if (fbAppString) {
        try {
          const data = JSON.parse(fbAppString);
          const fields = data[1]?.[1] || [];
          for (const field of fields) {
            const title = field[1];
            const type = field[3];
            const entryIdArray = field[4]?.[0];
            const entryId = entryIdArray?.[0];
            if (entryId) {
              const strEntryId = String(entryId);
              extractedList.push({ 
                id: field[0], 
                title: String(title), 
                type, 
                entryId: strEntryId 
              });
              foundEntryIds.delete(strEntryId);
              
              const key = `entry.${entryId}`;
              const titleLower = title ? String(title).toLowerCase() : "";
              if (titleLower.includes("nome") || titleLower.includes("name")) {
                suggestedMappings["fullName"] = key;
              } else if (titleLower.includes("cpf") || titleLower.includes("documento")) {
                suggestedMappings["cpf"] = key;
              } else if (titleLower.includes("email") || titleLower.includes("e-mail")) {
                suggestedMappings["email"] = key;
              } else if (titleLower.includes("telefone") || titleLower.includes("celular") || titleLower.includes("whatsapp") || titleLower.includes("contato") || titleLower.includes("phone") || titleLower.includes("wpp") || titleLower.includes("cel")) {
                suggestedMappings["phone"] = key;
              } else if (titleLower.includes("empresa") || titleLower.includes("institu") || titleLower.includes("organiza") || titleLower.includes("company")) {
                suggestedMappings["organization"] = key;
              } else if (titleLower.includes("cidade") || titleLower.includes("estado") || titleLower.includes("origem") || titleLower.includes("uf") || titleLower.includes("city")) {
                suggestedMappings["cityState"] = key;
              } else if (titleLower.includes("quantidade") || titleLower.includes("visitantes") || titleLower.includes("pessoas") || titleLower.includes("pax") || titleLower.includes("integrantes") || titleLower.includes("count")) {
                suggestedMappings["visitorCount"] = key;
              } else if (titleLower.includes("data") || titleLower.includes("período") || titleLower.includes("dia") || titleLower.includes("date")) {
                suggestedMappings["scheduledDate"] = key;
              } else if (titleLower.includes("objetivo") || titleLower.includes("fins") || titleLower.includes("motivo") || titleLower.includes("mensagem") || titleLower.includes("detalhado") || titleLower.includes("purpose")) {
                suggestedMappings["purpose"] = key;
              }
            }
          }
        } catch (e) {
          console.error("Erro no parsing da estrutura, acionando fallback", e);
        }
      }

      // Strategy 3: Direct regex matched fields (handles unparsed structures or corrupted HTML segments)
      const rawFieldPattern = /\[\s*(\d{7,12})\s*,\s*"([^"\\]*(?:\\.[^"\\]*)*)"\s*,[^,]*,\s*\d+\s*,\s*\[\s*\[\s*(\d{7,12})/g;
      let rawFm;
      while ((rawFm = rawFieldPattern.exec(pastedHtml)) !== null) {
        const fieldId = rawFm[1];
        const title = rawFm[2].replace(/\\"/g, '"');
        const entryId = rawFm[3];
        
        if (!extractedList.some((f) => f.entryId === entryId)) {
          extractedList.push({
            id: fieldId,
            title: title,
            type: "Campo do Formulário",
            entryId: entryId
          });
          foundEntryIds.delete(entryId);

          const key = `entry.${entryId}`;
          const titleLower = title.toLowerCase();
          if (titleLower.includes("nome") || titleLower.includes("name")) {
            suggestedMappings["fullName"] = key;
          } else if (titleLower.includes("cpf") || titleLower.includes("documento")) {
            suggestedMappings["cpf"] = key;
          } else if (titleLower.includes("email") || titleLower.includes("e-mail")) {
            suggestedMappings["email"] = key;
          } else if (titleLower.includes("telefone") || titleLower.includes("celular") || titleLower.includes("whatsapp") || titleLower.includes("contato") || titleLower.includes("phone") || titleLower.includes("wpp") || titleLower.includes("cel")) {
            suggestedMappings["phone"] = key;
          } else if (titleLower.includes("empresa") || titleLower.includes("institu") || titleLower.includes("organiza") || titleLower.includes("company")) {
            suggestedMappings["organization"] = key;
          } else if (titleLower.includes("cidade") || titleLower.includes("estado") || titleLower.includes("origem") || titleLower.includes("uf") || titleLower.includes("city")) {
            suggestedMappings["cityState"] = key;
          } else if (titleLower.includes("quantidade") || titleLower.includes("visitantes") || titleLower.includes("pessoas") || titleLower.includes("pax") || titleLower.includes("integrantes") || titleLower.includes("count")) {
            suggestedMappings["visitorCount"] = key;
          } else if (titleLower.includes("data") || titleLower.includes("período") || titleLower.includes("dia") || titleLower.includes("date")) {
            suggestedMappings["scheduledDate"] = key;
          } else if (titleLower.includes("objetivo") || titleLower.includes("fins") || titleLower.includes("motivo") || titleLower.includes("mensagem") || titleLower.includes("detalhado") || titleLower.includes("purpose")) {
            suggestedMappings["purpose"] = key;
          }
        }
      }

      // Strategy 4: Direct fallback scanning for entry IDs paired retrospectively
      foundEntryIds.forEach((entryId) => {
        let title = `Chave entry.${entryId}`;
        const index = pastedHtml.indexOf(entryId);
        if (index !== -1) {
          const surrounding = pastedHtml.slice(Math.max(0, index - 250), index);
          const labelMatch = surrounding.match(/"([^"]{3,40})"/g);
          if (labelMatch && labelMatch.length > 0) {
            title = `${labelMatch[labelMatch.length - 1].replace(/"/g, '')} (entry.${entryId})`;
          }
        }

        extractedList.push({
          id: entryId,
          title: title,
          type: "Detecção por Varredura",
          entryId: entryId
        });

        const key = `entry.${entryId}`;
        const titleLower = title.toLowerCase();
        if (titleLower.includes("nome") || titleLower.includes("name")) {
          suggestedMappings["fullName"] = key;
        } else if (titleLower.includes("cpf") || titleLower.includes("documento")) {
          suggestedMappings["cpf"] = key;
        } else if (titleLower.includes("email") || titleLower.includes("e-mail")) {
          suggestedMappings["email"] = key;
        } else if (titleLower.includes("telefone") || titleLower.includes("celular") || titleLower.includes("whatsapp") || titleLower.includes("contato") || titleLower.includes("phone") || titleLower.includes("wpp") || titleLower.includes("cel")) {
          suggestedMappings["phone"] = key;
        } else if (titleLower.includes("empresa") || titleLower.includes("institu") || titleLower.includes("organiza") || titleLower.includes("company")) {
          suggestedMappings["organization"] = key;
        } else if (titleLower.includes("cidade") || titleLower.includes("estado") || titleLower.includes("origem") || titleLower.includes("uf") || titleLower.includes("city")) {
          suggestedMappings["cityState"] = key;
        } else if (titleLower.includes("quantidade") || titleLower.includes("visitantes") || titleLower.includes("pessoas") || titleLower.includes("pax") || titleLower.includes("integrantes") || titleLower.includes("count")) {
          suggestedMappings["visitorCount"] = key;
        } else if (titleLower.includes("data") || titleLower.includes("período") || titleLower.includes("dia") || titleLower.includes("date")) {
          suggestedMappings["scheduledDate"] = key;
        } else if (titleLower.includes("objetivo") || titleLower.includes("fins") || titleLower.includes("motivo") || titleLower.includes("mensagem") || titleLower.includes("detalhado") || titleLower.includes("purpose")) {
          suggestedMappings["purpose"] = key;
        }
      });

      if (extractedList.length === 0) {
        setPasteParseMessage("Não foi possível encontrar nenhum identificador 'entry.xxxxx' no HTML colado. Certifique-se de carregar e copiar o código fonte completo da página pública de visualização do Google Forms.");
        return;
      }

      setScrapedFields(extractedList);
      
      // Ensure we only submit entry keys that actually exist in the pasted Google Form structure.
      // This avoids 400 Bad Request errors by not sending non-existent dummy keys.
      const validEntryKeys = new Set(extractedList.map(f => `entry.${f.entryId}`));
      
      const mergedMappings: Record<string, string> = {};
      const keysToMap = [
        "fullName",
        "cpf",
        "email",
        "phone",
        "organization",
        "cityState",
        "visitorCount",
        "scheduledDate",
        "purpose"
      ];
      
      for (const key of keysToMap) {
        if (suggestedMappings[key]) {
          mergedMappings[key] = suggestedMappings[key];
        } else {
          // Mantém o valor anterior preenchido manualmente ou salvo anteriormente
          mergedMappings[key] = fieldMappings[key] || "";
        }
      }
      
      setFieldMappings(mergedMappings);

      // Auto-save the mapped fields to the backend instantly!
      fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          googleFormsUrl: googleFormsUrl,
          mappings: mergedMappings
        })
      })
      .then(r => {
        if (!r.ok) {
          console.error("Wilson Sons - Erro ao sincronizar mapeamento automático");
        }
      })
      .catch(err => {
        console.error("Wilson Sons - Erro na rede ao salvar mapeamento automático:", err);
      });

      // If it is small, warn them but also import what was found
      if (pastedHtml.length < 15000) {
        setPasteParseMessage(`✓ Identificado parcialmente! Obtivemos ${extractedList.length} chaves e SALVAMOS automaticamente no servidor, mas o código fonte colado parece estar incompleto (apenas ${pastedHtml.length} caracteres).`);
      } else {
        setPasteParseMessage(`✓ Excelente! Encontramos com sucesso ${extractedList.length} campos no código colado e SALVAMOS todas as chaves automaticamente no servidor!`);
      }
      setPastedHtml("");
    } catch (err: any) {
      setPasteParseMessage(`Erro ao analisar código colado: ${err.message}`);
    }
  };

  useEffect(() => {
    const fetchConfig = async () => {
      setIsFetchingConfig(true);
      try {
        const resp = await fetch("/api/config");
        if (resp.ok) {
          const data = await resp.json();
          if (data.googleFormsUrl) setGoogleFormsUrl(data.googleFormsUrl);
          if (data.mappings) setFieldMappings(data.mappings);
          if (data.smtpHost) setSmtpHost(data.smtpHost);
          if (data.smtpPort) setSmtpPort(data.smtpPort);
          if (data.smtpUser) setSmtpUser(data.smtpUser);
          if (data.smtpPass) setSmtpPass(data.smtpPass);
          if (data.smtpFrom) setSmtpFrom(data.smtpFrom);
        }
      } catch (e) {
        console.error("Erro ao buscar configurações do servidor:", e);
      } finally {
        setIsFetchingConfig(false);
      }
    };
    fetchConfig();
  }, []);

  // KPI Calculations for Requests
  const stats: DashboardStats = {
    total: requests.length,
    pending: requests.filter((r) => r.status === VisitStatus.PENDING).length,
    approved: requests.filter((r) => r.status === VisitStatus.APPROVED).length,
    rejected: requests.filter((r) => r.status === VisitStatus.REJECTED).length,
  };

  // KPI Calculations for Feedbacks
  const totalFeedbacks = feedbacks.length;
  const avgOrgRating = totalFeedbacks 
    ? (feedbacks.reduce((sum, f) => sum + f.organizationRating, 0) / totalFeedbacks).toFixed(1)
    : "0.0";
  const avgSafetyRating = totalFeedbacks 
    ? (feedbacks.reduce((sum, f) => sum + f.safetyRating, 0) / totalFeedbacks).toFixed(1)
    : "0.0";
  const avgUsefulnessRating = totalFeedbacks 
    ? (feedbacks.reduce((sum, f) => sum + f.usefulnessRating, 0) / totalFeedbacks).toFixed(1)
    : "0.0";

  // List of unique organizations for filter list
  const uniqueOrgs = Array.from(new Set(requests.map((r) => r.organization)));

  // Filter requests
  const filteredRequests = requests.filter((req) => {
    const matchesSearch = 
      req.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.purpose.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "all" || req.status === statusFilter;
    const matchesOrg = orgFilter === "all" || req.organization === orgFilter;
    const matchesDate = !dateFilter || req.scheduledDate === dateFilter;

    return matchesSearch && matchesStatus && matchesOrg && matchesDate;
  });

  // Pagination computations
  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentRequests = filteredRequests.slice(indexOfFirstItem, indexOfLastItem);

  // Approved visits that have passed their scheduled date (eligible for feedback emailing)
  const todayStr = new Date().toISOString().slice(0, 10);
  const pastApprovedRequests = requests.filter(
    (r) => r.status === VisitStatus.APPROVED && r.scheduledDate < todayStr
  );

  // Login handler
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === "admin" || password === "kodie2026") {
      setIsAuthenticated(true);
      setAuthError("");
    } else {
      setAuthError("Senha incorreta. Por favor, tente novamente.");
    }
  };

  // Action Click Wrapper for status changes
  const handleActionClick = (req: VisitRequest, nextStatus: VisitStatus) => {
    if (nextStatus === VisitStatus.REJECTED) {
      setSelectedRequest(req);
      setIsRejecting(true);
      setRejectionInput("");
    } else {
      onChangeStatus(req.id, nextStatus);
      // Synchronize in local selected request
      if (selectedRequest && selectedRequest.id === req.id) {
        setSelectedRequest({
          ...selectedRequest,
          status: nextStatus
        });
      }
    }
  };

  // Confirm rejection with administrative reason
  const confirmRejection = () => {
    if (!selectedRequest) return;
    onChangeStatus(selectedRequest.id, VisitStatus.REJECTED, rejectionInput);
    setIsRejecting(false);
    setSelectedRequest(null);
  };

  // Dynamic feedback simulator submission mimicking the new Google Form
  const handleFeedbackSimulatorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showFeedbackSimulator) return;

    const newFeedback: FeedbackResponse = {
      id: `FB-${String(feedbacks.length + 1).padStart(3, "0")}`,
      requestId: showFeedbackSimulator.id,
      visitorName: showFeedbackSimulator.fullName,
      organization: showFeedbackSimulator.organization,
      visitDate: showFeedbackSimulator.scheduledDate,
      organizationRating: feedbackOrgRating,
      safetyRating: feedbackSafetyRating,
      usefulnessRating: feedbackUsefulnessRating,
      comments: feedbackComments,
      submissionDate: new Date().toISOString().slice(0, 10)
    };

    setFeedbacks((prev) => [newFeedback, ...prev]);
    setShowFeedbackSimulator(null);
    setFeedbackComments("");
    setFeedbackOrgRating(5);
    setFeedbackSafetyRating(5);
    setFeedbackUsefulnessRating(5);

    // Switch tab directly to show the recorded spreadsheet
    setActiveAdminTab("feedbacks");
  };

  // Re-generate or generate AI analysis on-the-fly from Admin Panel
  const triggerManualAI = async (req: VisitRequest) => {
    setIsGeneratingAI(req.id);
    try {
      const response = await fetch("/api/analyze-objective", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purpose: req.purpose,
          visitorCount: req.visitorCount,
          scheduledDate: req.scheduledDate,
          fullName: req.fullName,
          organization: req.organization
        })
      });

      if (response.ok) {
        const data = await response.json();
        const generatedSuggestions = data.suggestions || "";
        
        // Update requests state in App.tsx
        setRequests((prev) => 
          prev.map((r) => {
            if (r.id === req.id) {
              return { ...r, aiSuggestions: generatedSuggestions };
            }
            return r;
          })
        );

        // Update active selection details
        if (selectedRequest && selectedRequest.id === req.id) {
          setSelectedRequest((prev) => prev ? { ...prev, aiSuggestions: generatedSuggestions } : null);
        }
      } else {
        alert("Erro no servidor de IA ao computar roteiro de segurança.");
      }
    } catch (err) {
      console.error(err);
      alert("Falha de conexão com o microsserviço de inteligência artificial.");
    } finally {
      setIsGeneratingAI(null);
    }
  };

  // Export filtered items to fake CSV
  const handleExportCSV = () => {
    const headers = "ID;CPF;Solicitante;E-mail;Empresa;Procedência;Participantes;Data Proposta;Fisíco EPI;Status;Diretrizes IA\n";
    const body = filteredRequests.map((r) => {
      const sanitizedSuggestions = r.aiSuggestions ? r.aiSuggestions.replace(/[\n\r;]/g, " ") : "Sem diretrizes";
      return `${r.id};${r.cpf};${r.fullName};${r.email};${r.organization};${r.cityState};${r.visitorCount};${r.scheduledDate};${r.securityCleared ? "CONCEDIDO" : "RESTRITO"};${r.status};${sanitizedSuggestions}`;
    }).join("\n");
    
    const blob = new Blob([headers + body], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `WilsonSons_Planilha_Visitas_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const appsScriptCode = `/**
 * @OnlyCurrentDoc
 */
function onFormSubmit(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var values = e.values; // Respostas do Google Forms

  // Indexação das colunas de acordo com o design do formulário
  var timestamp = values[0];
  var fullName = values[1];
  var cpf = values[2];
  var email = values[3];
  var phone = values[4];
  var organization = values[5];
  var cityState = values[6];
  var visitorCount = values[7];
  var scheduledDate = values[8];
  var purpose = values[9];

  // Adiciona logs internos
  Logger.log("Processando solicitação de " + fullName + " da " + organization);

  // Enviar e-mail de confirmação ao visitante contendo o Termo de Uso e EPIs
  var clientSubject = "Confirmação de Solicitação de Visita - Wilson Sons";
  var clientBody = "Presado(a) " + fullName + ",\\n\\n" +
    "Recebemos seu pedido de agendamento para o dia " + scheduledDate + ".\\n\\n" +
    "IMPORTANTE: Lembre-se que o uso de EPIs (Óculos de Proteção, Capacete com Jugular, Colete de Alta Visibilidade e Botina de Biqueira de Aço) é de caráter OBRIGATÓRIO em todas as dependências operacionais.\\n\\n" +
    "Seu formulário de acompanhamento foi indexado com sucesso no Google Sheets em tempo real.\\n\\n" +
    "Atenciosamente,\\n" +
    "SESMT Wilson Sons Portuária";
  
  MailApp.sendEmail(email, clientSubject, clientBody);

  // Envia alerta urgente de segurança ao Gerente Operacional Wilson Sons
  var supervisorEmail = "thiagosimas1@gmail.com";
  var supervisorSubject = "ALERTA SESMT: Nova Solicitação de Visita - " + fullName;
  var supervisorBody = "Nova solicitação registrada por " + fullName + " da empresa " + organization + ".\\n" +
    "Objetivo: \\"" + purpose + "\\"\\n" +
    "Fatores de risco de EPI e identificação no Google Drive.\\n\\n" +
    "Por favor, revise o painel Lovable para aprovar ou rejeitar o agendamento.";

  MailApp.sendEmail(supervisorEmail, supervisorSubject, supervisorBody);
}

function updateVisitStatus(rowId, status, comments) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  // Altera os valores na aba de status operacional na planilha vinculada
}
`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(appsScriptCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // If not logged in, render the corporate authorization form
  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto py-16 px-4 animate-fade-in text-slate-800">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6 shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-2xl pointer-events-none" />

          <div className="text-center space-y-2">
            <div className="bg-orange-50 border border-orange-200 w-12 h-12 rounded-xl flex items-center justify-center mx-auto text-orange-600">
              <Lock className="h-6 w-6" />
            </div>
            <h2 className="font-display text-xl sm:text-2xl font-bold text-[#003366]">Ambiente Protegido</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Acesso exclusivo para gerentes operacionais de segurança do trabalho e supervisores Wilson Sons.
            </p>
          </div>

          {authError && (
            <div className="p-3 bg-red-50 border border-red-200 text-xs text-red-700 rounded-xl font-semibold">
              {authError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5" htmlFor="adminPass">
                <KeyRound className="h-4 w-4 text-slate-400" />
                Senha Administrativa
              </label>
              <input
                id="adminPass"
                type="password"
                required
                placeholder="Insira a credencial corporativa"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:bg-white font-mono font-medium transition-all"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-[#003366] hover:bg-[#002244] text-white font-bold text-sm rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <KeyRound className="h-4 w-4" />
              Autenticar Acesso
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 py-4 animate-fade-in text-slate-800">
      
      {/* Admin Action Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-250 pb-4">
        <div>
          <span className="text-orange-600 font-mono text-[10px] font-bold tracking-widest uppercase block mb-1">
            SISTEMA DE SEGURANÇA E FLUXO INTEGRADO
          </span>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#003366] flex items-center gap-2">
            <FileSpreadsheet className="h-7 w-7 text-orange-500" />
            Painel Administrativo Wilson Sons
          </h1>
        </div>

        {/* Action Toggle Tabs Inside Admin */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveAdminTab("solicitations")}
            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all ${
              activeAdminTab === "solicitations"
                ? "bg-[#003366] border-[#003366] text-white shadow-xs"
                : "bg-white border-slate-200 text-slate-600 hover:text-slate-900"
            }`}
          >
            <User className="h-4 w-4" />
            Análise SESMT &amp; Aprovação
          </button>
          <button
            onClick={() => setActiveAdminTab("feedbacks")}
            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all ${
              activeAdminTab === "feedbacks"
                ? "bg-[#003366] border-[#003366] text-white shadow-xs"
                : "bg-white border-slate-200 text-slate-600 hover:text-slate-900"
            }`}
          >
            <Star className="h-4 w-4 text-orange-500 fill-orange-500" />
            Aba: Respostas de Feedback
          </button>
          <button
            onClick={() => setActiveAdminTab("google_forms")}
            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all ${
              activeAdminTab === "google_forms"
                ? "bg-[#003366] border-[#003366] text-white shadow-xs"
                : "bg-white border-slate-200 text-slate-600 hover:text-slate-900"
            }`}
          >
            <FileSpreadsheet className="h-4 w-4 text-orange-400" />
            Integração Google Forms
          </button>
          <button
            onClick={() => setActiveAdminTab("automation")}
            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all ${
              activeAdminTab === "automation"
                ? "bg-[#003366] border-[#003366] text-white shadow-xs"
                : "bg-white border-slate-200 text-slate-600 hover:text-slate-900"
            }`}
          >
            <CodeXml className="h-4 w-4" />
            Apps Script &amp; Gmail
          </button>

          <button
            onClick={() => setActiveAdminTab("gate_validator")}
            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all ${
              activeAdminTab === "gate_validator"
                ? "bg-[#003366] border-[#003366] text-white shadow-xs"
                : "bg-white border-slate-200 text-slate-600 hover:text-slate-900"
            }`}
          >
            <QrCode className="h-4 w-4 text-orange-500" />
            Validador Portaria (QR Code)
          </button>

          <button
            onClick={() => setActiveAdminTab("dispatched_emails")}
            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all ${
              activeAdminTab === "dispatched_emails"
                ? "bg-[#003366] border-[#003366] text-white shadow-xs"
                : "bg-white border-slate-200 text-slate-600 hover:text-slate-900"
            }`}
          >
            <Mail className="h-4 w-4 text-[#F58220]" />
            E-mails Enviados (Crachás)
          </button>

          <button
            onClick={() => {
              setIsAuthenticated(false);
              localStorage.removeItem("wilson_sons_admin_authenticated");
            }}
            className="px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 transition-all font-sans"
          >
            <XCircle className="h-4 w-4" />
            Sair
          </button>
        </div>
      </div>

      {activeAdminTab === "solicitations" && (
        <>
          {/* Key Indicators Cards */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="bg-white border border-slate-200 p-5 rounded-2xl space-y-1 shadow-xs">
              <span className="text-xs font-mono font-medium text-slate-500 block uppercase">Total Solicitado</span>
              <div className="flex items-baseline justify-between font-display">
                <span className="text-3xl font-extrabold text-[#003366]">{stats.total}</span>
                <span className="text-[10px] text-slate-400 font-mono">visitas</span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2">
                <div className="bg-[#003366] h-full rounded-full" style={{ width: "100%" }} />
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-5 rounded-2xl space-y-1 shadow-xs">
              <span className="text-xs font-mono font-medium text-amber-600 block uppercase">Pendentes</span>
              <div className="flex items-baseline justify-between font-display">
                <span className="text-3xl font-extrabold text-amber-500">{stats.pending}</span>
                <span className="text-[10px] text-amber-600/70 font-mono">aguardando</span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2">
                <div 
                  className="bg-amber-500 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${stats.total ? (stats.pending / stats.total) * 100 : 0}%` }} 
                />
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-5 rounded-2xl space-y-1 shadow-xs">
              <span className="text-xs font-mono font-medium text-emerald-600 block uppercase">Aprovadas</span>
              <div className="flex items-baseline justify-between font-display">
                <span className="text-3xl font-extrabold text-emerald-650">{stats.approved}</span>
                <span className="text-[10px] text-emerald-600/80 font-mono">autorizadas</span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2">
                <div 
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${stats.total ? (stats.approved / stats.total) * 100 : 0}%` }} 
                />
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-5 rounded-2xl space-y-1 shadow-xs">
              <span className="text-xs font-mono font-medium text-red-650 block uppercase">Rejeitadas</span>
              <div className="flex items-baseline justify-between font-display">
                <span className="text-3xl font-extrabold text-red-650">{stats.rejected}</span>
                <span className="text-[10px] text-red-650/80 font-mono">vetadas</span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2">
                <div 
                  className="bg-red-500 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${stats.total ? (stats.rejected / stats.total) * 100 : 0}%` }} 
                />
              </div>
            </div>
          </section>

          {/* Filters Bar */}
          <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm animate-fade-in">
            <h3 className="text-xs font-display font-black text-[#003366] flex items-center gap-1.5 uppercase tracking-wide">
              <Filter className="h-4 w-4 text-orange-500" />
              Filtragem da Coleção Google Sheets
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-slate-500 block">Pesquisa de Texto</span>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Nome, e-mail, ID..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs placeholder-slate-400 focus:outline-hidden focus:border-orange-500 text-slate-750 font-medium"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-mono text-slate-500 block">Status Operacional</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-750 font-semibold focus:outline-hidden focus:border-orange-500 cursor-pointer"
                >
                  <option value="all">Ver Todos os Status</option>
                  <option value={VisitStatus.PENDING}>Pendente</option>
                  <option value={VisitStatus.APPROVED}>Aprovado</option>
                  <option value={VisitStatus.REJECTED}>Rejeitado</option>
                </select>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-mono text-slate-500 block">Empresa Representada</span>
                <select
                  value={orgFilter}
                  onChange={(e) => setOrgFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-750 font-semibold focus:outline-hidden focus:border-orange-500 cursor-pointer"
                >
                  <option value="all">Ver Todas as Empresas</option>
                  {uniqueOrgs.map((org) => (
                    <option key={org} value={org}>{org}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-mono text-slate-500 block">Data de Visita</span>
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-750 font-semibold focus:outline-hidden focus:border-orange-500 cursor-pointer"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-100">
              <button
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("all");
                  setOrgFilter("all");
                  setDateFilter("");
                }}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 bg-slate-100 px-3 py-2 rounded-lg transition-colors cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Limpar Filtros
              </button>

              <div className="flex items-center gap-3">
                <button
                  onClick={onResetDatabase}
                  title="Restaurar dados mockados iniciais"
                  className="px-3.5 py-2 hover:bg-slate-100 border border-slate-200 text-slate-600 font-bold text-xs rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Massa de Testes (Reset)
                </button>
                <button
                  onClick={handleExportCSV}
                  className="px-3.5 py-2 bg-[#003366] hover:bg-[#002244] text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                  Exportar Excel (CSV)
                </button>
              </div>
            </div>
          </section>

          {/* Detailed Rejection Prompt Modal */}
          {isRejecting && selectedRequest && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in shadow-2xl">
              <div className="bg-white border border-red-200 w-full max-w-md rounded-2xl p-6 space-y-4 shadow-xl">
                <h4 className="font-display font-bold text-lg text-red-700 flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-500" />
                  Reprovar Solicitação de Visita
                </h4>
                <div className="space-y-1 text-xs leading-relaxed">
                  <p className="text-slate-800 font-semibold mb-2">
                    Você está reprovando o agendamento de <strong className="text-red-700">{selectedRequest.fullName}</strong> (da empresa: {selectedRequest.organization}).
                  </p>
                  <p className="text-slate-500">
                    Insira o motivo operacional da rejeição. Isso enviará automaticamente um e-mail com as diretrizes corretivas ao solicitante:
                  </p>
                </div>
                <textarea
                  rows={3}
                  value={rejectionInput}
                  onChange={(e) => setRejectionInput(e.target.value)}
                  placeholder="Ex: Documentação complementar de segurança ou identificação do CPF ausente."
                  className="w-full p-2.5 bg-slate-50 border border-slate-205 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-red-500 focus:bg-white transition-all font-medium"
                />
                <div className="flex justify-end gap-2 text-xs font-bold pt-2">
                  <button
                    onClick={() => {
                      setIsRejecting(false);
                      setSelectedRequest(null);
                    }}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-650 rounded-lg cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={confirmRejection}
                    className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-sm cursor-pointer"
                  >
                    Confirmar Reprovação
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Visits Spreadsheet Grid */}
          <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="bg-[#003366] px-5 py-4 border-b border-[#002244] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                <h4 className="font-display font-semibold text-sm text-slate-100">
                  Análise SESMT &amp; Aprovação – Banco de Dados Principal
                </h4>
              </div>
              <span className="text-[10px] font-mono text-[#cceeff] shrink-0">Status: Sincronizado</span>
            </div>

            {filteredRequests.length === 0 ? (
              <div className="p-12 text-center text-slate-400 space-y-2">
                <p>Nenhuma solicitação encontrada para os filtros aplicados.</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                        <th className="p-3.5 font-mono">ID</th>
                        <th className="p-3.5">Visitante / Organização</th>
                        <th className="p-3.5">Fins &amp; Participantes</th>
                        <th className="p-3.5">Data Visita</th>
                        <th className="p-3.5 text-center">Segurança (EPI)</th>
                        <th className="p-3.5 text-center">Roteiro Inteligente (IA)</th>
                        <th className="p-3.5">Status</th>
                        <th className="p-3.5 text-right">Controles SESMT</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150 text-slate-750">
                      {currentRequests.map((req) => (
                        <tr 
                          key={req.id} 
                          onClick={() => setSelectedRequest(req)}
                          className={`hover:bg-slate-50/70 transition-colors cursor-pointer ${
                            selectedRequest?.id === req.id ? "bg-slate-100/60 font-semibold" : ""
                          }`}
                        >
                          <td className="p-3.5 font-mono text-orange-600 font-bold whitespace-nowrap">
                            {req.id}
                          </td>
                          <td className="p-3.5">
                            <div className="text-[13px] font-extrabold text-slate-800">{req.fullName}</div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">{req.cpf} • {req.organization}</div>
                          </td>
                          <td className="p-3.5 max-w-xs">
                            <p className="truncate text-slate-600" title={req.purpose}>{req.purpose}</p>
                            <div className="text-[10px] text-slate-400 font-bold mt-1">Visitantes: {req.visitorCount} pax</div>
                          </td>
                          <td className="p-3.5 font-mono text-slate-700 whitespace-nowrap">
                            {req.scheduledDate.split("-").reverse().join("/")}
                          </td>
                          <td className="p-3.5 text-center whitespace-nowrap">
                            {req.securityCleared ? (
                              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                                <CheckCircle className="h-3 w-3" />
                                CONCEDIDO
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] text-red-600 font-bold bg-red-50 border border-red-200 px-2.5 py-0.5 rounded-full">
                                <ShieldAlert className="h-3 w-3 animate-pulse" />
                                RESTRITO
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            {req.aiSuggestions ? (
                              <span 
                                className="inline-flex items-center gap-1 text-[10px] text-[#003366] font-bold bg-orange-50 border border-orange-200 px-2.5 py-1 rounded-md"
                                title="Clique em 'Ver Detalhes' para examinar o roteiro elaborado"
                              >
                                <Sparkles className="h-30 w-3 text-orange-500 fill-orange-500/20" />
                                Elaborado
                              </span>
                            ) : (
                              <button
                                onClick={() => triggerManualAI(req)}
                                disabled={isGeneratingAI !== null}
                                className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-[#003366] text-[10px] font-bold rounded flex items-center gap-1 transition-all"
                              >
                                {isGeneratingAI === req.id ? (
                                  <div className="w-2.5 h-2.5 border border-slate-200 border-t-[#003366] rounded-full animate-spin" />
                                ) : (
                                  <Sparkles className="h-3 w-3 text-slate-400" />
                                )}
                                Gerar IA
                              </button>
                            )}
                          </td>
                          <td className="p-3.5">
                            {req.status === VisitStatus.PENDING && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-amber-50 text-amber-700 px-2.5 py-0.5 rounded border border-amber-200">
                                PENDENTE
                              </span>
                            )}
                            {req.status === VisitStatus.APPROVED && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded border border-emerald-200">
                                APROVADA
                              </span>
                            )}
                            {req.status === VisitStatus.REJECTED && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-red-50 text-red-700 px-2.5 py-0.5 rounded border border-red-200">
                                REJEITADA
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5">
                              {req.status !== VisitStatus.APPROVED && (
                                <button
                                  onClick={() => handleActionClick(req, VisitStatus.APPROVED)}
                                  title="Aprovar e enviar e-mail"
                                  className="p-1.5 bg-[#e6fffa] border border-[#b2f5ea] text-emerald-600 hover:bg-emerald-500 hover:text-white rounded transition-all cursor-pointer"
                                >
                                  <CheckCircle className="h-3.5 w-3.5" />
                                </button>
                              )}

                              {req.status !== VisitStatus.REJECTED && (
                                <button
                                  onClick={() => handleActionClick(req, VisitStatus.REJECTED)}
                                  title="Recusar agendamento"
                                  className="p-1.5 bg-red-50 border border-red-150 text-red-600 hover:bg-red-500 hover:text-white rounded transition-all cursor-pointer"
                                >
                                  <XCircle className="h-3.5 w-3.5" />
                                </button>
                              )}

                              <button
                                onClick={() => {
                                  if (confirm("Deseja apagar essa linha definitivamente? (Simulação de deleção no Sheets)")) {
                                    onDeleteRequest(req.id);
                                  }
                                }}
                                title="Deletar linha"
                                className="p-1.5 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-605 border border-slate-200 rounded transition-all cursor-pointer"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Painel de Paginação de Alta Fidelidade */}
                <div className="bg-slate-50 px-5 py-4 border-t border-slate-250 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs select-none">
                  <div className="flex items-center gap-3 text-slate-600">
                    <span>
                      Exibindo <strong>{Math.min(indexOfFirstItem + 1, filteredRequests.length)}</strong> a{" "}
                      <strong>{Math.min(indexOfLastItem, filteredRequests.length)}</strong> de{" "}
                      <strong>{filteredRequests.length}</strong> solicitações
                    </span>
                    <span className="hidden sm:inline text-slate-300">|</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500">Linhas por página:</span>
                      <select
                        value={itemsPerPage}
                        onChange={(e) => {
                          setItemsPerPage(Number(e.target.value));
                          setCurrentPage(1);
                        }}
                        className="bg-white border border-slate-200 rounded px-2 py-1 text-[#003366] font-bold focus:outline-hidden font-sans cursor-pointer focus:ring-1 focus:ring-[#003366]"
                      >
                        <option value={5}>5 por página</option>
                        <option value={10}>10 por página</option>
                        <option value={20}>20 por página</option>
                        <option value={50}>50 por página</option>
                      </select>
                    </div>
                  </div>

                  {totalPages >= 1 && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="p-1 px-2 rounded border border-slate-200 bg-white text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 transition-all cursor-pointer flex items-center justify-center gap-1 font-medium"
                        title="Página Anterior"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                        Anterior
                      </button>

                      <div className="flex items-center gap-1">
                        {Array.from({ length: totalPages || 1 }, (_, i) => i + 1).map((pg) => {
                          if (
                            totalPages > 5 &&
                            pg !== 1 &&
                            pg !== totalPages &&
                            Math.abs(pg - currentPage) > 1
                          ) {
                            if (pg === 2 && currentPage > 3) {
                              return <span key="ellipsis-1" className="px-1 text-slate-400 font-mono">...</span>;
                            }
                            if (pg === totalPages - 1 && currentPage < totalPages - 2) {
                              return <span key="ellipsis-2" className="px-1 text-slate-400 font-mono">...</span>;
                            }
                            return null;
                          }

                          return (
                            <button
                              key={pg}
                              onClick={() => setCurrentPage(pg)}
                              className={`px-3 py-1 text-xs font-bold rounded transition-all cursor-pointer ${
                                currentPage === pg
                                  ? "bg-[#003366] text-white"
                                  : "bg-white border border-slate-200 text-slate-650 hover:bg-slate-100"
                              }`}
                            >
                              {pg}
                            </button>
                          );
                        })}
                      </div>

                      <button
                        onClick={() => setCurrentPage((p) => Math.min(totalPages || 1, p + 1))}
                        disabled={currentPage === (totalPages || 1)}
                        className="p-1 px-2 rounded border border-slate-200 bg-white text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 transition-all cursor-pointer flex items-center justify-center gap-1 font-medium"
                        title="Próxima Página"
                      >
                        Próxima
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </section>

          {/* Quick Details Overlay Panel */}
          {selectedRequest && !isRejecting && (
            <section className="bg-white border-2 border-[#003366] rounded-2xl p-6 space-y-5 shadow-md animate-fade-in text-slate-800">
              <div className="flex items-center justify-between pb-3 border-b border-slate-150">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-orange-600 bg-orange-50 px-2.5 py-0.5 rounded-full font-bold">
                    {selectedRequest.id}
                  </span>
                  <h4 className="font-display font-black text-[#003366] text-base">Ficha Operacional de Visita</h4>
                </div>
                <button 
                  onClick={() => setSelectedRequest(null)}
                  className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer"
                >
                  Fechar Painel
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 space-y-2 text-xs">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#003366] block font-extrabold border-b border-slate-200 pb-1">Identificação do Visitante</span>
                  <div className="space-y-1.5 text-slate-700">
                    <div><strong>Nome Completo:</strong> {selectedRequest.fullName}</div>
                    <div><strong>Documento CPF:</strong> {selectedRequest.cpf}</div>
                    <div><strong>E-mail:</strong> {selectedRequest.email}</div>
                    <div><strong>Telefone:</strong> {selectedRequest.phone}</div>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 space-y-2 text-xs">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#003366] block font-extrabold border-b border-slate-200 pb-1">Condições da Visita</span>
                  <div className="space-y-1.5 text-slate-700">
                    <div><strong>Empresa:</strong> {selectedRequest.organization}</div>
                    <div><strong>Procedência / UF:</strong> {selectedRequest.cityState}</div>
                    <div><strong>Data Solicitada:</strong> {selectedRequest.scheduledDate.split("-").reverse().join("/")}</div>
                    <div><strong>Participantes:</strong> {selectedRequest.visitorCount} pessoas</div>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 space-y-2 text-xs">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#003366] block font-extrabold border-b border-slate-200 pb-1">Segurança e Status</span>
                  <div className="space-y-1.5 text-slate-700">
                    <div className="flex items-center gap-1">
                      <strong>Termo de EPI:</strong> 
                      {selectedRequest.securityCleared ? (
                        <span className="text-emerald-700 font-bold bg-emerald-50 px-1 py-0.5 rounded border border-emerald-150">VALIDADO OK</span>
                      ) : (
                        <span className="text-red-700 font-bold bg-red-50 px-1 py-0.5 rounded border border-red-150">RESTRIÇÃO</span>
                      )}
                    </div>
                    {selectedRequest.securityConsentDate && (
                      <div className="text-[10px] text-slate-400 font-mono">
                        Validado: {new Date(selectedRequest.securityConsentDate).toLocaleString()}
                      </div>
                    )}
                    <div className="pt-1.5 border-t border-slate-200">
                      <strong>Status Operacional atual:</strong>
                      <span className="ml-1.5 font-bold uppercase text-orange-605 bg-orange-50 px-2 py-0.5 border border-orange-100 rounded text-[10px]">{selectedRequest.status}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Purpose block */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-705 leading-relaxed">
                <strong className="block mb-1 text-[10px] font-mono uppercase text-[#003366] tracking-wide font-black">Objetivo Detalhado da Visita:</strong>
                <p className="italic font-medium text-slate-700">"{selectedRequest.purpose}"</p>
              </div>

              {/* AI Recommendations block */}
              <div className="p-4 bg-orange-50/40 rounded-xl border border-orange-200 space-y-3.5">
                <div className="flex items-center justify-between border-b border-orange-100 pb-2">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-orange-700 flex items-center gap-1.5 font-extrabold">
                    <Sparkles className="h-4 w-4 text-orange-500 fill-orange-500/20" />
                    Estudo de Itinerário Inteligente &amp; Segurança (IA Gemini Wilson Sons)
                  </span>
                  
                  {!selectedRequest.aiSuggestions && (
                    <button
                      onClick={() => triggerManualAI(selectedRequest)}
                      disabled={isGeneratingAI !== null}
                      className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white font-bold text-[10px] rounded flex items-center gap-1 shadow-sm transition-all cursor-pointer"
                    >
                      {isGeneratingAI === selectedRequest.id ? "Analisando..." : "Mapear Instalações"}
                    </button>
                  )}
                </div>

                {selectedRequest.aiSuggestions ? (
                  <div className="bg-white/80 border border-orange-150 p-4 rounded-lg text-xs leading-relaxed text-slate-700 whitespace-pre-line font-medium shadow-3xs">
                    {selectedRequest.aiSuggestions}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">
                    Nenhuma sugestão computada de local ou EPI específico para esta solicitação. Clique em "Mapear Instalações" para acionar a IA baseada no objetivo.
                  </p>
                )}
              </div>

              {/* Status Update triggers */}
              <div className="flex gap-2 justify-end text-xs font-bold pt-1 border-t border-slate-100">
                {selectedRequest.status !== VisitStatus.APPROVED && (
                  <button
                    onClick={() => handleActionClick(selectedRequest, VisitStatus.APPROVED)}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg flex items-center gap-1.5 shadow-3xs transition-colors cursor-pointer"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Aprovar e Enviar Roteiro Operacional
                  </button>
                )}
                {selectedRequest.status !== VisitStatus.REJECTED && (
                  <button
                    onClick={() => handleActionClick(selectedRequest, VisitStatus.REJECTED)}
                    className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-1.5 shadow-3xs transition-colors cursor-pointer"
                  >
                    <XCircle className="h-4 w-4" />
                    Reprovar Solicitação
                  </button>
                )}
                {(selectedRequest.status === VisitStatus.REJECTED || selectedRequest.status === VisitStatus.APPROVED) && (
                  <button
                    onClick={() => handleActionClick(selectedRequest, VisitStatus.PENDING)}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                  >
                    Marcar como Pendente
                  </button>
                )}
                {selectedRequest.status === VisitStatus.APPROVED && (
                  <button
                    onClick={() => setViewingBadge(selectedRequest)}
                    className="px-4 py-2.5 bg-[#003366] hover:bg-[#002244] text-white rounded-lg flex items-center gap-1.5 shadow-3xs transition-colors cursor-pointer"
                  >
                    <Eye className="h-4 w-4" />
                    Visualizar Crachá de Acesso
                  </button>
                )}
              </div>
            </section>
          )}

          {/* Feedback Emails Senders & Triggers Section */}
          <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <div className="space-y-1">
                <h4 className="font-display font-bold text-sm text-[#003366] flex items-center gap-1.5">
                  <Send className="h-4 w-4 text-orange-500 animate-pulse" />
                  Módulo de E-mail de Feedback Pós-Visita
                </h4>
                <p className="text-[11px] text-slate-500 leading-normal">
                  Sempre que um agendamento é marcado como <code className="bg-emerald-50 text-emerald-800 font-bold px-1 rounded">Aprovado</code> e a data de visita passa do dia atual, o sistema Wilson Sons automaticamente dispara um e-mail ao visitante contendo o link de opinião.
                </p>
              </div>
            </div>

            {pastApprovedRequests.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-2">
                Nenhuma visita aprovada e realizada no passado elegível para feedback no momento.
              </p>
            ) : (
              <div className="space-y-3">
                <span className="text-[10px] font-mono text-slate-450 block font-bold uppercase tracking-wider">Histórico de Disparos de E-mail de Feedback</span>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {pastApprovedRequests.map((req) => (
                    <div key={req.id} className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex items-start justify-between gap-3 text-xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-orange-650">{req.id}</span>
                          <span className="font-bold text-slate-800">{req.fullName}</span>
                        </div>
                        <p className="text-slate-500 text-[11px]">E-mail: {req.email} | Empresa: {req.organization}</p>
                        <p className="text-[10px] text-slate-400 font-mono">Data da Visita: {req.scheduledDate.split("-").reverse().join("/")}</p>
                        
                        <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-md mt-2 w-fit">
                          <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                          E-mail disparado via Gmail em: {req.feedbackSentDate || new Date().toISOString().slice(0, 10)}
                        </div>
                      </div>

                      <button
                        onClick={() => setShowFeedbackSimulator(req)}
                        className="px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold text-[10px] rounded-lg shadow-sm whitespace-nowrap self-center hover:scale-102 transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Simular Feedback
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </>
      )}

      {activeAdminTab === "feedbacks" && (
        <>
          {/* Rating aggregate cards */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="bg-white border border-slate-200 p-5 rounded-2xl space-y-1 shadow-xs">
              <span className="text-xs font-mono font-medium text-slate-500 block uppercase">Avaliações Totais</span>
              <div className="flex items-baseline justify-between font-display">
                <span className="text-3xl font-extrabold text-[#003366]">{totalFeedbacks}</span>
                <span className="text-[10px] text-slate-450 font-mono">respostas</span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2">
                <div className="bg-[#003366] h-full rounded-full" style={{ width: "100%" }} />
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-5 rounded-2xl space-y-1 shadow-xs">
              <span className="text-xs font-mono font-medium text-orange-600 block uppercase">Organização Geral</span>
              <div className="flex items-baseline justify-between font-display">
                <span className="text-3xl font-extrabold text-orange-500 flex items-center gap-1">
                  {avgOrgRating}
                  <Star className="h-5 w-5 text-orange-500 fill-orange-500 shrink-0" />
                </span>
                <span className="text-[10px] text-slate-400 font-mono">/ 5.0 estrelas</span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2">
                <div className="bg-orange-500 h-full rounded-full" style={{ width: `${(Number(avgOrgRating) / 5) * 100}%` }} />
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-5 rounded-2xl space-y-1 shadow-xs">
              <span className="text-xs font-mono font-medium text-emerald-600 block uppercase">Segurança Operacional</span>
              <div className="flex items-baseline justify-between font-display">
                <span className="text-3xl font-extrabold text-emerald-600 flex items-center gap-1">
                  {avgSafetyRating}
                  <Star className="h-5 w-5 text-emerald-500 fill-emerald-500 shrink-0" />
                </span>
                <span className="text-[10px] text-slate-400 font-mono">/ 5.0 estrelas</span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2">
                <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${(Number(avgSafetyRating) / 5) * 100}%` }} />
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-5 rounded-2xl space-y-1 shadow-xs">
              <span className="text-xs font-mono font-medium text-indigo-650 block uppercase">Aproveitamento e Valia</span>
              <div className="flex items-baseline justify-between font-display">
                <span className="text-3xl font-extrabold text-indigo-650 flex items-center gap-1">
                  {avgUsefulnessRating}
                  <Star className="h-5 w-5 text-indigo-500 fill-indigo-500 shrink-0" />
                </span>
                <span className="text-[10px] text-slate-400 font-mono">/ 5.0 estrelas</span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2">
                <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${(Number(avgUsefulnessRating) / 5) * 100}%` }} />
              </div>
            </div>
          </section>

          {/* Feedback Spreadsheet Replica Card */}
          <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="bg-[#003366] px-5 py-4 border-b border-[#002244] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-orange-500" />
                <h4 className="font-display font-semibold text-sm text-slate-100">
                  Google Sheets – Aba: [Respostas de Feedback]
                </h4>
              </div>
              <span className="text-[10px] font-mono text-[#cceeff]">Sincronizado via Google Forms</span>
            </div>

            {feedbacks.length === 0 ? (
              <div className="p-10 text-center text-slate-400">
                <p className="text-xs italic">Nenhuma resposta de formulário de feedback gravada nesta aba de planilha até o momento.</p>
                <p className="text-[11px] text-slate-500 mt-2">Use o "Simulador de E-mail" acima para emitir respostas de testes pós-visita.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                      <th className="p-3.5 font-mono">ID Resposta</th>
                      <th className="p-3.5 font-mono">ID Visita</th>
                      <th className="p-3.5">Nome do Visitante</th>
                      <th className="p-3.5">Organização</th>
                      <th className="p-3.5 text-center">Organização (1-5)</th>
                      <th className="p-3.5 text-center">Clareza Seg.(1-5)</th>
                      <th className="p-3.5 text-center">Utilidade (1-5)</th>
                      <th className="p-3.5">Comentários e Relatos de Segurança</th>
                      <th className="p-3.5">Carimbo de Data</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 text-slate-700">
                    {feedbacks.map((fb) => (
                      <tr key={fb.id} className="hover:bg-slate-50/60 font-medium">
                        <td className="p-3.5 font-mono text-indigo-700 font-bold whitespace-nowrap">
                          {fb.id}
                        </td>
                        <td className="p-3.5 font-mono text-orange-600 font-bold whitespace-nowrap">
                          {fb.requestId}
                        </td>
                        <td className="p-3.5 font-bold text-slate-800">
                          {fb.visitorName}
                        </td>
                        <td className="p-3.5 text-slate-650">
                          {fb.organization}
                        </td>
                        <td className="p-3.5 text-center font-bold text-amber-600">
                          {fb.organizationRating} ★
                        </td>
                        <td className="p-3.5 text-center font-bold text-emerald-650">
                          {fb.safetyRating} ★
                        </td>
                        <td className="p-3.5 text-center font-bold text-indigo-650">
                          {fb.usefulnessRating} ★
                        </td>
                        <td className="p-3.5 max-w-sm font-medium text-slate-600 block pl-3.5 py-4">
                          <p className="truncate sm:whitespace-normal leading-relaxed" title={fb.comments}>{fb.comments || "Sem observações."}</p>
                        </td>
                        <td className="p-3.5 font-mono text-slate-500 text-[10px] whitespace-nowrap">
                          {fb.submissionDate.split("-").reverse().join("/")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      {activeAdminTab === "google_forms" && (
        <section className="space-y-6 animate-fade-in text-xs">
          <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
            <span className="text-orange-600 font-mono text-[10px] font-bold tracking-widest uppercase block">
              DIAGNÓSTICO E AJUSTE DE FLUXO COM O PLANILHAS GOOGLE
            </span>
            <h3 className="font-display font-black text-lg sm:text-xl text-[#003366] flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-orange-500" />
              Sincronização de Banco de Dados pelo Google Forms
            </h3>
            <p className="text-slate-655 text-xs0 leading-relaxed max-w-3xl">
              Por diretriz corporativa, nossa aplicação se integra diretamente ao seu formulário Google Forms. O servidor processa o envio simulando uma submissão HTTP, o que atualiza automaticamente a Planilha Google vinculada em tempo real, sem expor tokens ou requerer APIs pagas.
            </p>
            
            {/* Environment Info */}
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1.5 text-slate-700 leading-normal">
              <p className="font-bold flex items-center gap-1.5 text-orange-600 uppercase text-[10px] font-mono tracking-wide">
                <ShieldAlert className="h-4 w-4 shrink-0" />
                SOBRE CAMPOS EXTRAS E CONFLITOS DE ESTRUTURA
              </p>
              <p>
                <strong>Não há problema se os formulários tiverem quantidade de campos diferentes!</strong> Se o seu Google Form tiver <strong>menos campos</strong> que o formulário da nossa aplicação, o Google simplesmente ignorará os parâmetros extras. No entanto, para os campos que existem, as chaves identificadoras (<code className="bg-slate-200 font-mono px-1 rounded text-red-700">entry.xxxxxxxxx</code>) devem corresponder com exatidão, ou os dados correspondentes chegarão em branco. Por isso, utilize o assistente automatizado abaixo para detectar as chaves corretas!
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Form Setup Panel */}
            <div className="lg:col-span-7 bg-white border border-slate-200 p-5 rounded-2xl shadow-xs space-y-5">
              <h4 className="font-display font-bold text-[#003366] text-[13px] border-b border-slate-100 pb-2">
                1. Configuração do Formulário Google de Destino
              </h4>
              
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-500 block uppercase font-bold">Link de Visualização do Google Forms (viewform)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={googleFormsUrl}
                      onChange={(e) => setGoogleFormsUrl(e.target.value)}
                      placeholder="https://docs.google.com/forms/d/e/1FAIpQL.../viewform"
                      className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold placeholder-slate-450 focus:outline-hidden focus:border-orange-500 font-mono"
                    />
                    <button
                      type="button"
                      disabled={isScrapingForms}
                      onClick={async () => {
                        setIsScrapingForms(true);
                        setScrapeError("");
                        setSaveSuccess(false);
                        try {
                          const resp = await fetch("/api/test-scrape", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ url: googleFormsUrl })
                          });
                          const data = await resp.json();
                          if (resp.ok && data.success) {
                            setScrapedFields(data.extractedFields || []);
                            // Update mappings
                            setFieldMappings((prev) => ({
                              ...prev,
                              ...data.suggestedMappings
                            }));
                            setSaveSuccess(true);
                            setTimeout(() => setSaveSuccess(false), 3000);
                          } else {
                            setScrapeError(data.error || "O servidor não conseguiu extrair as tags HTML do Google Forms.");
                          }
                        } catch (e: any) {
                          setScrapeError("Não foi possível conectar com a API de autodetecção de campos.");
                        } finally {
                          setIsScrapingForms(false);
                        }
                      }}
                      className="px-3 py-2 bg-[#003366] text-white hover:bg-[#002244] font-bold text-xs rounded-lg transition-all shadow-xs flex items-center gap-1 hover:scale-101 cursor-pointer disabled:opacity-50"
                    >
                      {isScrapingForms ? "Detectando..." : "Autodetectar Chaves"}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Insira o link público do formulário Google e clique em Autodetectar para extrair as chaves de entrada automaticamente.
                  </p>
                </div>

                {scrapeError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg font-medium text-[11px] leading-relaxed">
                    <p className="font-bold flex items-center gap-1 text-red-650">
                      <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
                      Por que o Scraping Automatizado falhou?
                    </p>
                    <p className="mt-1">
                      O Google costuma bloquear servidores em nuvem (como o Cloud Run) exigindo um "Fazer Login no Google" ou desafio de bot. Isso acontece principalmente se o seu formulário estiver configurado com a opção <strong>"Limitar a 1 resposta"</strong> ou restrições organizacionais ativas.
                    </p>
                    <p className="mt-2 font-bold text-slate-700">
                      Utilize a Solução 100% Garantida abaixo, colando o código do formulário diretamente!
                    </p>
                  </div>
                )}

                {saveSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg font-bold text-[11px]">
                    ✓ Chaves autodetectadas com sucesso do HTML público do formulário! Revise os valores abaixo.
                  </div>
                )}

                {/* Foolproof Local Paste Method */}
                <div className="mt-4 border border-indigo-100 bg-linear-to-r from-indigo-50/50 to-slate-50/50 p-4 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
                      <span className="font-bold text-[11.5px] text-[#003366] uppercase tracking-wide font-sans">
                        Método Alternativo (100% Garantido e Sem Bloqueios)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowPasteArea(!showPasteArea)}
                      className="px-2.5 py-1 text-[10px] font-bold bg-[#003366] text-white hover:bg-[#002244] transition-all rounded shadow-xs"
                    >
                      {showPasteArea ? "Ocultar Instruções" : "Abrir Assistente de Cópia"}
                    </button>
                  </div>

                  <p className="text-slate-550 text-[11px] leading-relaxed">
                    Basta colar o código fonte da página pública de visualização do formulário. Como seu próprio computador já está autenticado no Google, não há nenhuma barreira ou CAPTCHA capaz de bloquear!
                  </p>

                  {showPasteArea && (
                    <div className="space-y-3 border-t border-indigo-100 pt-3 animate-fade-in text-[11px] text-slate-650 leading-normal">
                      <span className="font-extrabold font-mono text-[9px] uppercase tracking-wider text-indigo-700 block">
                        PASSO A PASSO PARA INTEGRAR OPERACIONALMENTE EM 30 SEGUNDOS:
                      </span>
                      <ol className="list-decimal pl-4 space-y-1.5">
                        <li>
                          Abra o link do formulário Google (<a href={googleFormsUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-semibold">{googleFormsUrl.slice(0, 50)}...</a>) em uma nova aba do seu navegador.
                        </li>
                        <li>
                          Pressione <kbd className="px-1.5 py-0.5 bg-slate-200 text-slate-800 rounded font-mono text-[9px]">Ctrl + U</kbd> (ou clique com botão direito e vá em <strong>"Exibir código fonte da página"</strong>).
                        </li>
                        <li>
                          Pressione <kbd className="px-1.5 py-0.5 bg-slate-200 text-slate-800 rounded font-mono text-[9px]">Ctrl + A</kbd> para selecionar o código inteiro, e depois <kbd className="px-1.5 py-0.5 bg-slate-200 text-slate-800 rounded font-mono text-[9px]">Ctrl + C</kbd> para copiar tudo.
                        </li>
                        <li>
                          Cole todo o conteúdo da área de transferência na caixa abaixo e clique em <strong>"Extrair e Mapear"</strong>!
                        </li>
                      </ol>

                      <div className="space-y-1 mt-2.5">
                        <textarea
                          rows={4}
                          value={pastedHtml}
                          onChange={(e) => setPastedHtml(e.target.value)}
                          placeholder="Cole aqui o código fonte completo do Google Forms (começando com <!DOCTYPE html> ou <html ...)"
                          className="w-full p-2.5 bg-white border border-slate-200 rounded-lg font-mono text-[10px] focus:outline-hidden focus:border-indigo-500"
                        />
                        <button
                          type="button"
                          onClick={handleParsePastedHtml}
                          className="w-full py-2 bg-indigo-600 text-white font-extrabold text-xs hover:bg-indigo-700 transition-colors rounded-lg shadow-xs flex items-center justify-center gap-1.5 cursor-pointer uppercase tracking-wider"
                        >
                          <CheckCircle className="h-4 w-4" />
                          Extrair e Mapear (Extrair dados do código colado)
                        </button>
                      </div>
                    </div>
                  )}

                  {pasteParseMessage && (
                    <div className={`p-2.5 rounded-lg border font-medium text-[11px] leading-relaxed font-mono ${
                      pasteParseMessage.includes("✓") 
                        ? "bg-emerald-50 border-emerald-200 text-emerald-900 shadow-3xs" 
                        : "bg-amber-50 border-amber-200 text-amber-900 shadow-3xs"
                    }`}>
                      {pasteParseMessage}
                    </div>
                  )}
                </div>
              </div>

              {/* Mapping Edit Area */}
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-[#003366] font-bold uppercase tracking-wider block">Associação dos Campos (App ➔ Form Google)</span>
                  <button
                    onClick={() => {
                      setFieldMappings({
                        fullName: "entry.2005620554",
                        cpf: "entry.1045781291",
                        email: "entry.1065046570",
                        phone: "entry.1166974658",
                        organization: "entry.839129744",
                        cityState: "entry.254131568",
                        visitorCount: "entry.184131551",
                        scheduledDate: "entry.981313411",
                        purpose: "entry.198134135"
                      });
                    }}
                    className="text-[10px] font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 bg-slate-100 px-2 py-1 rounded transition-colors cursor-pointer"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Resetar para Padrão
                  </button>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-[11px] border-collapse bg-white">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                        <th className="p-2.5">Nome do Campo no App</th>
                        <th className="p-2.5">Descrição</th>
                        <th className="p-2.5 w-44">Chave de Destino (Inspecione)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150 text-slate-700 font-medium">
                      <tr>
                        <td className="p-2.5 font-bold">fullName</td>
                        <td className="p-2.5 text-slate-500">Nome completo do solicitante</td>
                        <td className="p-2.5">
                          <input
                            type="text"
                            value={fieldMappings.fullName || ""}
                            onChange={(e) => setFieldMappings({ ...fieldMappings, fullName: e.target.value })}
                            placeholder="entry.abcdef"
                            className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-md font-mono font-bold text-slate-800"
                          />
                        </td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-bold">cpf</td>
                        <td className="p-2.5 text-slate-500">Número do CPF</td>
                        <td className="p-2.5">
                          <input
                            type="text"
                            value={fieldMappings.cpf || ""}
                            onChange={(e) => setFieldMappings({ ...fieldMappings, cpf: e.target.value })}
                            placeholder="entry.abcdef"
                            className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-md font-mono font-bold text-slate-800"
                          />
                        </td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-bold">email</td>
                        <td className="p-2.5 text-slate-500">Endereço de e-mail</td>
                        <td className="p-2.5">
                          <input
                            type="text"
                            value={fieldMappings.email || ""}
                            onChange={(e) => setFieldMappings({ ...fieldMappings, email: e.target.value })}
                            placeholder="entry.abcdef"
                            className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-md font-mono font-bold text-slate-800"
                          />
                        </td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-bold">phone</td>
                        <td className="p-2.5 text-slate-500">Telefone / Telefone Celular</td>
                        <td className="p-2.5">
                          <input
                            type="text"
                            value={fieldMappings.phone || ""}
                            onChange={(e) => setFieldMappings({ ...fieldMappings, phone: e.target.value })}
                            placeholder="entry.abcdef"
                            className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-md font-mono font-bold text-slate-800"
                          />
                        </td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-bold">organization</td>
                        <td className="p-2.5 text-slate-500">Empresa / Instituição representada</td>
                        <td className="p-2.5">
                          <input
                            type="text"
                            value={fieldMappings.organization || ""}
                            onChange={(e) => setFieldMappings({ ...fieldMappings, organization: e.target.value })}
                            placeholder="entry.abcdef"
                            className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-md font-mono font-bold text-slate-800"
                          />
                        </td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-bold">cityState</td>
                        <td className="p-2.5 text-slate-500">Cidade e Estado de origem</td>
                        <td className="p-2.5">
                          <input
                            type="text"
                            value={fieldMappings.cityState || ""}
                            onChange={(e) => setFieldMappings({ ...fieldMappings, cityState: e.target.value })}
                            placeholder="entry.abcdef"
                            className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-md font-mono font-bold text-slate-800"
                          />
                        </td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-bold">visitorCount</td>
                        <td className="p-2.5 text-slate-500">Quantidade de Visitantes adicionais</td>
                        <td className="p-2.5">
                          <input
                            type="text"
                            value={fieldMappings.visitorCount || ""}
                            onChange={(e) => setFieldMappings({ ...fieldMappings, visitorCount: e.target.value })}
                            placeholder="entry.abcdef"
                            className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-md font-mono font-bold text-slate-800"
                          />
                        </td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-bold">scheduledDate</td>
                        <td className="p-2.5 text-slate-500">Data de agendamento proposta</td>
                        <td className="p-2.5">
                          <input
                            type="text"
                            value={fieldMappings.scheduledDate || ""}
                            onChange={(e) => setFieldMappings({ ...fieldMappings, scheduledDate: e.target.value })}
                            placeholder="entry.abcdef"
                            className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-md font-mono font-bold text-slate-800"
                          />
                        </td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-bold">purpose</td>
                        <td className="p-2.5 text-slate-500">Objetivo detalhado da visita</td>
                        <td className="p-2.5">
                          <input
                            type="text"
                            value={fieldMappings.purpose || ""}
                            onChange={(e) => setFieldMappings({ ...fieldMappings, purpose: e.target.value })}
                            placeholder="entry.abcdef"
                            className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-md font-mono font-bold text-slate-800"
                          />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Save Trigger */}
              <div className="flex justify-end pt-2 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isSavingConfig}
                  onClick={async () => {
                    setIsSavingConfig(true);
                    try {
                      const res = await fetch("/api/config", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          googleFormsUrl,
                          mappings: fieldMappings
                        })
                      });
                      if (res.ok) {
                        alert("Configuração de Integração salva com sucesso!");
                      } else {
                        alert("Erro ao gravar alteração na base de dados local.");
                      }
                    } catch (e) {
                      alert("Falha de conexão com o microsserviço de configuração.");
                    } finally {
                      setIsSavingConfig(false);
                    }
                  }}
                  className="px-5 py-3 bg-emerald-600 font-extrabold text-xs text-white rounded-xl transition-all shadow-sm flex items-center gap-1.5 hover:bg-emerald-700 hover:scale-102 cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle className="h-4 w-4" />
                  Salvar Configurações &amp; Mapeamento
                </button>
              </div>
            </div>

            {/* Test Simulation Panel */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* Card - Real Email SMTP Server Settings (Dynamic configurations input) */}
              <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs space-y-4 text-xs">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                  <Mail className="h-4.5 w-4.5 text-[#003366]" />
                  <h4 className="font-display font-bold text-[#003366] text-[13px] uppercase">
                    2. Configuração do Servidor SMTP de E-mail
                  </h4>
                </div>
                <p className="text-slate-500 text-[11px] leading-relaxed">
                  Para que os e-mails com as credenciais cheguem de verdade aos visitantes, preencha os dados do seu provedor de e-mail (Gmail, Outlook, Hostgator, Locaweb, etc.):
                </p>

                {/* Helper box for common SMTP errors like Gmail BadCredentials */}
                <div className="bg-amber-50/90 border border-amber-200 rounded-lg p-3 space-y-1.5 text-[11px] leading-normal text-amber-900">
                  <div className="font-bold flex items-center gap-1.5 text-amber-800">
                    <span className="text-xs">🔑</span> <strong>Atenção para usuários Gmail / Google Workspace:</strong>
                  </div>
                  <p className="text-amber-850">
                    O Google bloqueia logins SMTP com a sua senha comum. Para usar o Gmail (<code className="bg-amber-100 font-mono px-1 rounded text-amber-950">smtp.gmail.com</code> porta <code className="bg-amber-100 font-mono px-1 rounded text-amber-950">587</code>), siga estes passos:
                  </p>
                  <ol className="list-decimal pl-4.5 space-y-1 text-amber-850">
                    <li>Acesse as configurações da sua <strong>Conta Google</strong> (<a href="https://myaccount.google.com" target="_blank" rel="noreferrer" className="underline font-bold text-amber-900 hover:text-amber-950">myaccount.google.com</a>).</li>
                    <li>Certifique-se de que a <strong>Verificação em Duas Etapas</strong> está ATIVADA.</li>
                    <li>Pesquise por <strong>"Senhas de app"</strong> na caixa de pesquisa da sua conta.</li>
                    <li>Insira um nome explicativo (ex: <i>Portaria Wilson Sons</i>) e clique em <b>Criar</b>.</li>
                    <li>Copie o código gerado de <strong>16 letras</strong> (ex: <code className="bg-amber-200/70 font-mono font-bold px-1 rounded text-amber-950">abcd efgh ijkl mnop</code>) e cole-o completo (sem espaços) no campo de senha abaixo!</li>
                  </ol>
                </div>

                <div className="space-y-3.5">
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono font-bold text-slate-500 block uppercase">SMTP Host / Servidor</label>
                    <input
                      type="text"
                      value={smtpHost}
                      onChange={(e) => setSmtpHost(e.target.value)}
                      placeholder="smtp.gmail.com"
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-hidden focus:border-orange-500 font-mono text-slate-800"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-1 space-y-1">
                      <label className="text-[10px] font-mono font-bold text-slate-500 block uppercase">Porta</label>
                      <input
                        type="text"
                        value={smtpPort}
                        onChange={(e) => setSmtpPort(e.target.value)}
                        placeholder="587"
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-hidden focus:border-orange-500 font-mono text-slate-800"
                      />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <label className="text-[10px] font-mono font-bold text-slate-500 block uppercase">Novo Remetente (FROM)</label>
                      <input
                        type="text"
                        value={smtpFrom}
                        onChange={(e) => setSmtpFrom(e.target.value)}
                        placeholder="sesmt@wilsonsons.com.br"
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-hidden focus:border-orange-500 font-mono text-slate-800"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-mono font-bold text-slate-500 block uppercase">Usuário / Conta de E-mail</label>
                    <input
                      type="text"
                      value={smtpUser}
                      onChange={(e) => setSmtpUser(e.target.value)}
                      placeholder="portaria-sesmt@suaempresa.com"
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-hidden focus:border-orange-500 font-mono text-slate-800"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-mono font-bold text-slate-500 block uppercase">Senha / Password de App</label>
                      <span className="text-[8.5px] text-orange-600 font-bold">Use senha de aplicativo</span>
                    </div>
                    <input
                      type="password"
                      value={smtpPass}
                      onChange={(e) => setSmtpPass(e.target.value)}
                      placeholder="••••••••••••••••••••"
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-hidden focus:border-orange-500 font-mono text-slate-800"
                    />
                  </div>

                  <button
                    type="button"
                    disabled={isSavingSmtp}
                    onClick={async () => {
                      if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
                        alert("Por favor, preencha todos os campos SMTP obrigatórios (Host, Porta, Usuário, Senha).");
                        return;
                      }
                      setIsSavingSmtp(true);
                      try {
                        const res = await fetch("/api/config", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            smtpHost,
                            smtpPort,
                            smtpUser,
                            smtpPass,
                            smtpFrom
                          })
                        });
                        if (res.ok) {
                          alert("✅ Servidor SMTP corporativo configurado e salvo com sucesso!");
                        } else {
                          alert("❌ Erro ao gravar as chaves SMTP.");
                        }
                      } catch (err: any) {
                        alert("Erro ao salvar SMTP: " + err.message);
                      } finally {
                        setIsSavingSmtp(false);
                      }
                    }}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-lg transition-colors text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-3xs"
                  >
                    <CheckCircle className="h-3.5 w-3.5" />
                    {isSavingSmtp ? "Salvando SMTP..." : "Salvar Configurações SMTP"}
                  </button>

                  <button
                    type="button"
                    disabled={isTestingSmtp || isSavingSmtp}
                    onClick={async () => {
                      if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
                        alert("Por favor, preencha todos os campos SMTP obrigatórios (Host, Porta, Usuário, Senha) antes de testar.");
                        return;
                      }
                      setIsTestingSmtp(true);
                      setSmtpTestStatus(null);
                      try {
                        const res = await fetch("/api/test-smtp", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            smtpHost,
                            smtpPort,
                            smtpUser,
                            smtpPass
                          })
                        });
                        const data = await res.json();
                        if (data.success) {
                          setSmtpTestStatus({ success: true, message: data.message });
                        } else {
                          setSmtpTestStatus({ success: false, message: data.error });
                        }
                      } catch (err: any) {
                        setSmtpTestStatus({ success: false, message: "Erro na requisição: " + err.message });
                      } finally {
                        setIsTestingSmtp(false);
                      }
                    }}
                    className="w-full py-2 bg-slate-700 hover:bg-slate-800 text-white font-extrabold rounded-lg transition-colors text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-3xs"
                  >
                    <span>⚡</span>
                    {isTestingSmtp ? "Testando Conexão..." : "Testar Conexão SMTP em Tempo Real"}
                  </button>

                  {smtpTestStatus && (
                    <div className={`p-3 rounded-lg text-xs leading-relaxed ${
                      smtpTestStatus.success 
                        ? "bg-emerald-50 border border-emerald-250 text-emerald-900"
                        : "bg-rose-50 border border-rose-250 text-rose-900"
                    }`}>
                      <div className="font-bold flex items-center gap-1.5 mb-1 text-[11px]">
                        <span>{smtpTestStatus.success ? "✅" : "⚠️"}</span>
                        <span>{smtpTestStatus.success ? "Conexão Estabelecida com Sucesso" : "Falha na Conexão SMTP"}</span>
                      </div>
                      <p className="text-[10px] whitespace-pre-wrap">{smtpTestStatus.message}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Live Webhook Test Panel */}
              <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl shadow-xs space-y-4">
                <h4 className="font-display font-bold text-[#003366] text-[13px] border-b border-slate-200 pb-2 uppercase">
                  3. Simulador de Disparo em Tempo Real (Google Forms)
                </h4>
                <p className="text-slate-500 text-[11px] leading-relaxed">
                  Para atestar a validade de sua conexão sem precisar simular no pátio físico, preencha as credenciais padrão de testes corporativos abaixo e solicite um envio forçado diretamente para a Planilha do Google Forms!
                </p>

                <div className="space-y-4.5 pt-1.5">
                  <button
                    type="button"
                    disabled={isTestSubmitting}
                    onClick={async () => {
                      setIsTestSubmitting(true);
                      setTestSubmitStatus(null);
                      try {
                        const response = await fetch("/api/submit-to-google-form", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            fullName: "Thiago Simas Operational Test",
                            cpf: "000.111.222-33",
                            email: "thiagosimas1@gmail.com",
                            phone: "(21) 98765-4321",
                            organization: "Wilson Sons Supervisor Test",
                            cityState: "Rio de Janeiro - RJ",
                            visitorCount: 1,
                            scheduledDate: new Date().toISOString().slice(0, 10),
                            purpose: "Teste operacional integrado de disparo e persistência no Google Forms Wilson Sons."
                          })
                        });
                        const data = await response.json();
                        setTestSubmitStatus(data);
                      } catch (err: any) {
                        setTestSubmitStatus({ success: false, error: err.message });
                      } finally {
                        setIsTestSubmitting(false);
                      }
                    }}
                    className="w-full py-3 bg-orange-500 text-white font-extrabold rounded-xl text-center flex items-center justify-center gap-2 hover:bg-orange-600 transition-colors shadow-sm text-xs cursor-pointer disabled:opacity-50"
                  >
                    {isTestSubmitting ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    Disparar Linha de Teste (Thiago Simas)
                  </button>

                  {testSubmitStatus && (
                    <div className={`p-4 rounded-xl border border-dashed leading-relaxed space-y-2 text-xs font-mono font-medium ${
                      testSubmitStatus.success 
                        ? "bg-emerald-50 border-emerald-300 text-emerald-850" 
                        : "bg-red-50 border-red-300 text-red-850"
                    }`}>
                      <div className="font-bold uppercase text-[10px] tracking-wider mb-1 flex items-center gap-1">
                        {testSubmitStatus.success ? (
                          <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                        ) : (
                          <ShieldAlert className="h-4 w-4 text-red-500 shrink-0" />
                        )}
                        Resultado da Submissão: {testSubmitStatus.success ? "SUCESSO" : "ERRO"}
                      </div>
                      <p><strong>Status HTTP:</strong> {testSubmitStatus.success ? "200 ou 302 (OK / REDIRECT)" : "Erro Interno"}</p>
                      <p><strong>Detalhe de Retorno:</strong> {testSubmitStatus.message || testSubmitStatus.error}</p>
                      {testSubmitStatus.success && (
                        <p className="text-[10px] text-slate-500 font-sans mt-2.5">
                          ✓ Se os campos estiverem mapeados com as chaves "entry.xxxx", a nova linha com o nome <strong>"Thiago Simas Operational Test"</strong> foi gravada na sua aba vinculada do Planilhas Google! Acesse sua planilha para certificar-se.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Scraped Fields Finder helper panel */}
              {scrapedFields.length > 0 && (
                <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs space-y-3">
                  <span className="text-[10px] font-mono font-bold text-purple-600 uppercase tracking-widest block">Chaves Públicas Detectadas no Form Google</span>
                  <p className="text-[11px] text-slate-500">
                    O autodetectador navegou no formulário fornecido com sucesso e extraiu as seguintes chaves do HTML. Você pode usá-las para preencher as caixas de mapeamento ao lado:
                  </p>

                  <div className="max-h-56 overflow-y-auto border border-slate-150 rounded-lg text-[10px] divide-y divide-slate-100 font-mono">
                    {scrapedFields.map((f: any, idx: number) => (
                      <div key={idx} className="p-2 hover:bg-slate-50 flex items-start justify-between gap-2.5">
                        <div className="space-y-0.5">
                          <div className="font-bold font-sans text-slate-750 text-[11px]">{f.title || "Pergunta sem título"}</div>
                          <div className="text-slate-400">Tipo: {f.type === 2 ? "Texto Longo" : f.type === 0 ? "Texto Curto" : "Seleção"}</div>
                        </div>
                        <span 
                          onClick={() => {
                            navigator.clipboard.writeText(`entry.${f.entryId}`);
                            alert(`Código 'entry.${f.entryId}' copiado para a área de transferência!`);
                          }}
                          className="font-bold text-[#003366] bg-slate-100 border border-slate-200 hover:bg-slate-200 px-1.5 py-0.5 font-mono cursor-pointer rounded title='Clique para copiar'"
                        >
                          entry.{f.entryId}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {activeAdminTab === "automation" && (
        <section className="space-y-6">
          <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
            <h3 className="font-display font-bold text-lg text-[#003366]">
              Guia de Integração Apps Script e Banco Google Sheets
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              As automações da Wilson Sons utilizam triggers ativos do Google. Quando um visitante submete o formulário, o roteamento captura as coordenadas de e-mail e faz as validações do termo de EPI. No menu Apps Script, basta criar as duas abas principais de planilhas: <strong>[Solicitações]</strong> e <strong>[Respostas de Feedback]</strong>, e incorporar as chamadas abaixo.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-700 leading-relaxed">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <strong className="block border-b border-slate-200 pb-1 font-bold text-slate-800">Passos de Sincronização:</strong>
                <ol className="list-decimal list-inside space-y-2 pl-1.5 text-slate-650">
                  <li>No Sheets, ative <strong>Extensões</strong> &gt; <strong>Apps Script</strong>.</li>
                  <li>Insira a rotina fornecida ao lado.</li>
                  <li>Salve o projeto com a variável de administrador <code className="text-[#003360] bg-slate-200 font-mono px-1 rounded font-bold">thiagosimas1@gmail.com</code>.</li>
                  <li>Configure o acionador de formulário para disparo Ao Enviar.</li>
                </ol>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <strong className="block border-b border-slate-200 pb-1 font-bold text-slate-800">Rotinas Integradas do Loop:</strong>
                <ul className="list-disc list-inside space-y-2 pl-1.5 text-slate-650">
                  <li>Notificações ao visitante e checagem de saúde na fábrica.</li>
                  <li>Integração entre o Google Form de visualização operacional e o painel.</li>
                  <li>Armazenamento de logs com as predições geradas no backend Lovable.</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-[#0e1b2e] border border-[#090f1d] rounded-2xl overflow-hidden shadow-lg">
            <div className="bg-[#0b1424] px-4 py-3 border-b border-[#060a12] flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-orange-500 uppercase tracking-widest block">Código Fonte Google Apps Script</span>
              <button 
                onClick={handleCopyCode}
                className="px-3 py-1.5 bg-[#0e1b2e] border border-[#16273f] text-xs font-semibold text-slate-300 hover:text-white rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Copy className="h-3.5 w-3.5" />
                <span>{copiedCode ? "Copiado!" : "Copiar Código"}</span>
              </button>
            </div>
            
            <pre className="p-4 overflow-x-auto text-[11px] font-mono text-slate-350 bg-[#0e1b2e] max-h-[380px] leading-relaxed">
              <code>{appsScriptCode}</code>
            </pre>
          </div>
        </section>
      )}

      {activeAdminTab === "gate_validator" && (
        <section className="space-y-6 animate-fade-in text-slate-800">
          <div className="bg-white border border-slate-200 p-6 sm:p-8 rounded-2xl shadow-sm space-y-4">
            <h3 className="font-display font-bold text-lg text-[#003366] flex items-center gap-2">
              <QrCode className="h-5.5 w-5.5 text-orange-500" />
              Simulador de Validação de Crachá por QR Code (Controle de Portaria Wilson Sons)
            </h3>
            <p className="text-sm text-slate-600 max-w-2xl">
              Neste terminal, a Portaria ou Guarita do Porto pode escanear o QR Code impresso no crachá do visitante (celular ou papel) para validar seu acesso e registrar a entrada em tempo real.
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-4">
              
              {/* Simulator Controls & Video Feed Simulation */}
              <div className="lg:col-span-5 space-y-4">
                <div className="bg-slate-900 rounded-2xl border border-slate-800 p-4 shadow-md flex flex-col justify-between text-center min-h-[300px] text-white relative overflow-hidden">
                  
                  {/* Subtle red scan line animation */}
                  <div className="absolute inset-x-0 top-1/2 h-0.5 bg-red-500 shadow-lg shadow-red-500/50 animate-[bounce_3s_infinite] pointer-events-none" />
                  
                  <span className="text-[9px] font-mono font-bold text-slate-450 uppercase tracking-widest block mb-2">
                    WEBCAM PORTAL DE LEITURA SESMT ACTIVO
                  </span>

                  <div className="my-auto space-y-4 max-w-[240px] mx-auto z-10">
                    <QrCode className="h-16 w-16 mx-auto text-orange-400 animate-pulse" />
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Selecione um visitante aprovado no painel ao lado para simular o escaneamento na câmera física do porto.
                    </p>
                  </div>

                  {/* Manual ID Input fallback */}
                  <div className="space-y-2 mt-4 pt-4 border-t border-slate-800 z-10 text-left">
                    <label className="text-[10px] font-mono uppercase text-slate-450 block font-bold">DIGITAR ID DO CRACHÁ (WS-REQ-XXX)</label>
                    <div className="flex gap-2">
                      <input 
                        type="text"
                        placeholder="Ex: WS-REQ-001"
                        id="manualQrInput"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            //@ts-ignore
                            handleScanValidation((e.target as HTMLInputElement).value);
                          }
                        }}
                        className="bg-slate-850 border border-slate-700 text-white font-mono text-xs uppercase px-3 py-1.5 rounded-lg flex-1 focus:outline-hidden focus:border-orange-500"
                      />
                      <button 
                        onClick={() => {
                          const input = document.getElementById("manualQrInput") as HTMLInputElement;
                          if (input) handleScanValidation(input.value);
                        }}
                        className="px-3.5 py-1.5 bg-orange-500 hover:bg-orange-600 border border-orange-550 text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
                      >
                        Validar
                      </button>
                    </div>
                  </div>
                </div>

                {/* Simulated Trigger Select Dropdown */}
                <div className="p-4 bg-orange-50/70 border border-orange-200 rounded-xl space-y-2">
                  <span className="text-[10px] font-mono font-bold uppercase text-orange-600 block">SIMULADOR DE LEITURA PORTÁTIL</span>
                  <label className="text-xs font-semibold text-slate-700 block mt-1">Escolha uma solicitação de visita para simular leitura de QR Code:</label>
                  <select 
                    onChange={(e) => {
                      if (e.target.value) {
                        handleScanValidation(e.target.value);
                      }
                    }}
                    defaultValue=""
                    className="w-full text-xs p-2 bg-white border border-slate-250 rounded-lg text-slate-850 font-medium cursor-pointer focus:outline-hidden"
                  >
                    <option value="" disabled>-- Selecione um Visitante --</option>
                    {requests.map(r => (
                      <option key={r.id} value={r.id}>
                        [{r.status.toUpperCase()}] {r.fullName} ({r.id})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Scan result display panel */}
              <div className="lg:col-span-7 bg-slate-50 border border-slate-200 rounded-2xl p-6 min-h-[300px] flex flex-col justify-between">
                {scanResult ? (
                  <div className="space-y-6 animate-fade-in">
                    
                    {/* Status Badge */}
                    <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                      <div>
                        <span className="text-[10px] text-slate-455 font-mono font-bold uppercase block">RESULTADO DA VERIFICAÇÃO</span>
                        <div className="flex items-center gap-2 mt-1">
                          {scanResult.status === "allow" && (
                            <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-300 text-emerald-700 rounded-full font-bold text-xs uppercase font-mono shadow-3xs">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                              Acesso Liberado • Entrada Livre
                            </span>
                          )}
                          {scanResult.status === "pending" && (
                            <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-300 text-amber-700 rounded-full font-bold text-xs uppercase font-mono shadow-3xs">
                              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                              Acesso Retindo • Pendente SESMT
                            </span>
                          )}
                          {scanResult.status === "deny" && (
                            <span className="flex items-center gap-1.5 px-3 py-1 bg-red-50 border border-red-300 text-red-700 rounded-full font-bold text-xs uppercase font-mono shadow-3xs">
                              Acesso Bloqueado • Recusado
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* Audio simulation notice */}
                      <span className="text-[9px] font-mono text-slate-400 italic bg-white border border-slate-150 px-2.5 py-1 rounded">
                        Beep auditivo simulado 🔊
                      </span>
                    </div>

                    {/* Visitor Card */}
                    <div className="flex flex-col sm:flex-row gap-5 items-start">
                      
                      {/* Photo preview in validation */}
                      <div className="relative w-28 h-32 bg-slate-100 rounded-lg overflow-hidden border-2 border-slate-200 shrink-0 flex items-center justify-center">
                        {scanResult.request.visitorPhoto ? (
                          <img 
                            src={scanResult.request.visitorPhoto} 
                            alt={scanResult.request.fullName}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="p-3 text-slate-400 text-center space-y-1">
                            <User className="h-8 w-8 mx-auto text-slate-350" />
                            <p className="text-[10px] font-mono font-bold leading-none">Sem Foto</p>
                          </div>
                        )}
                        <span className={`absolute bottom-0 inset-x-0 text-center text-white font-mono text-[8.5px] font-bold py-0.5 uppercase ${
                          scanResult.status === "allow" ? "bg-emerald-600" : "bg-red-650"
                        }`}>
                          {scanResult.request.id}
                        </span>
                      </div>

                      {/* Info details */}
                      <div className="space-y-3 font-sans text-xs flex-1">
                        <div>
                          <span className="text-[10px] font-mono font-bold text-slate-400 block uppercase">NOME DO VISITANTE</span>
                          <strong className="text-[#003366] text-sm uppercase font-display font-extrabold">{scanResult.request.fullName}</strong>
                        </div>

                        <div className="grid grid-cols-2 gap-3.5 pt-1.5 border-t border-slate-150">
                          <div>
                            <span className="text-[10px] font-mono text-slate-400 block uppercase">EMPRESA / INSTITUIÇÃO</span>
                            <span className="font-semibold text-slate-700 uppercase">{scanResult.request.organization}</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-mono text-slate-400 block uppercase">DOCUMENTO (CPF)</span>
                            <span className="font-mono text-slate-700">{scanResult.request.cpf}</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-mono text-slate-400 block uppercase">DATA AUTORIZADA</span>
                            <span className="font-mono font-bold text-[#003366]">{scanResult.request.scheduledDate.split("-").reverse().join("/")}</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-mono text-[#003360] block uppercase">VISITANTES</span>
                            <span className="font-mono text-slate-700">{scanResult.request.visitorCount} pessoa(s)</span>
                          </div>
                        </div>

                        {scanResult.request.rejectionReason && scanResult.status === "deny" && (
                          <div className="bg-red-50 border border-red-150 p-2.5 rounded-lg text-red-850 text-[11px] font-medium leading-relaxed">
                            <strong>Motivo do Bloqueio:</strong> "{scanResult.request.rejectionReason}"
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Safety compliance checks */}
                    <div className="bg-white border border-slate-205 p-3.5 rounded-xl text-slate-650 text-[11px] leading-relaxed">
                      <p className="font-bold text-[#003366] uppercase text-[9.5px] font-mono mb-1.5">CONFORMIDADE DE SEGURANÇA E EPIS OBRIGATÓRIOS SEGUNDO SESMT:</p>
                      <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 pl-4 list-disc text-slate-500 font-medium">
                        <li>Termo de Responsabilidade Assinado: <span className="text-emerald-600 font-bold font-mono">OK</span></li>
                        <li>Tutorial de Riscos de Pátio: <span className="text-emerald-600 font-bold font-mono">OK</span></li>
                        <li>Capacete Portuário: <span className="text-orange-600 font-bold font-mono">REQUERIDO</span></li>
                        <li>Bota de Aço de Segurança: <span className="text-orange-600 font-bold font-mono">REQUERIDO</span></li>
                      </ul>
                    </div>

                  </div>
                ) : (
                  <div className="my-auto text-center p-8 space-y-4 max-w-sm mx-auto">
                    <QrCode className="h-10 w-10 text-slate-350 mx-auto" />
                    <h4 className="font-display font-extrabold text-slate-700 text-sm">Nenhum QR Code Escaneado</h4>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Selecione um agendamento na lista suspensa móvel ou digite o ID para demonstrar como o validador do porto reage auditiva e visualmente!
                    </p>
                  </div>
                )}

                {/* Scan log tracker */}
                <div className="border-t border-slate-200 mt-6 pt-4 text-left text-[10px] text-slate-400 font-mono tracking-tight flex items-center justify-between">
                  <span>TERMINAL ID: WS-GATE-01 (DOCK CENTRAL)</span>
                  <span>IP REDE: 10.12.92.51 (INTERNO)</span>
                </div>
              </div>

            </div>
          </div>
        </section>
      )}

      {activeAdminTab === "dispatched_emails" && (
        <section className="space-y-6 animate-fade-in text-slate-800">
          <div className="bg-white border border-slate-200 p-6 sm:p-8 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-[#F58220]" />
              <div>
                <h3 className="font-display font-bold text-lg text-[#003366]">
                  Histórico de E-mails Enviados Automaticamente (SMTP Logs)
                </h3>
                <p className="text-xs text-slate-500">
                  Os crachás virtuais de acesso são liberados e encaminhados de forma 100% automatizada assim que o status da visita é aprovado pelo SESMT.
                </p>
              </div>
            </div>

            {mailLogs.length === 0 ? (
              <div className="border border-dashed border-slate-200 rounded-2xl p-12 text-center text-slate-400 space-y-2">
                <Mail className="h-10 w-10 mx-auto text-slate-350 animate-pulse" />
                <h4 className="font-bold text-slate-700">Nenhum Email Disparado</h4>
                <p className="text-xs max-w-sm mx-auto text-slate-500">
                  Aprove solicitações de visita para simular o recebimento automático de e-mails contendo a credencial oficial para impressão.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
                {/* Email Sidebar List */}
                <div className="lg:col-span-4 border border-slate-200 rounded-xl overflow-hidden bg-slate-50 max-h-[500px] overflow-y-auto divide-y divide-slate-150">
                  <div className="bg-slate-100 p-3 text-xs font-bold text-[#003366] uppercase tracking-wider border-b border-slate-200">
                    Mensagens Disparadas ({mailLogs.length})
                  </div>
                  <div className="divide-y divide-slate-150">
                    {mailLogs.map((log) => {
                      const isActive = (selectedMailId || mailLogs[0]?.id) === log.id;
                      return (
                        <button
                          key={log.id}
                          onClick={() => setSelectedMailId(log.id)}
                          className={`w-full text-left p-3.5 text-xs transition-colors cursor-pointer block ${
                            isActive 
                              ? "bg-white border-l-4 border-orange-500 font-medium" 
                              : "hover:bg-slate-100 bg-slate-50"
                          }`}
                        >
                          <div className="flex justify-between items-center mb-1 text-slate-550 text-[10px] font-mono">
                            <span className="font-bold uppercase tracking-wider text-orange-600">{log.type === "approval" ? "APROVAÇÃO ✓" : "RECUSA ❌"}</span>
                            <span>{log.date}</span>
                          </div>
                          <div className="font-extrabold text-slate-800 truncate mb-0.5">{log.subject}</div>
                          <div className="text-slate-550 truncate text-[11px]">Para: {log.to}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Email Content Detail Pane */}
                <div className="lg:col-span-8 border border-slate-200 rounded-xl bg-white p-5 flex flex-col justify-between min-h-[450px]">
                  {(() => {
                    const activeMailId = selectedMailId || mailLogs[0]?.id;
                    const log = mailLogs.find(m => m.id === activeMailId) || mailLogs[0];
                    if (!log) return null;

                    return (
                      <div className="space-y-5 h-full flex flex-col justify-between text-left">
                        <div>
                          {/* Standard Mail Fields (Headers) */}
                          <div className="border border-slate-150 rounded-lg p-3 bg-slate-50 text-xs space-y-1 text-left font-sans">
                            <div><strong className="text-slate-500 font-mono">REMETENTE:</strong> <span className="font-bold text-[#003366]">sesmt@wilsonsons.com.br</span> (SMTP Seguro Wilson Sons)</div>
                            <div><strong className="text-slate-550 font-mono">DESTINATÁRIO:</strong> <span className="font-semibold text-slate-800 underline">{log.to}</span></div>
                            <div><strong className="text-slate-550 font-mono">ASSUNTO:</strong> <span className="font-extrabold text-slate-900">{log.subject}</span></div>
                            <div><strong className="text-slate-550 font-mono">DATA DE DISPARO:</strong> <span className="font-mono text-slate-600">{log.date} (Automático)</span></div>
                          </div>

                          {/* Email Message Text Box */}
                          <div className="flex justify-between items-center mt-4 mb-2">
                            <span className="text-xs font-bold text-slate-500 uppercase font-mono tracking-wide">Exibição do Conteúdo</span>
                            {log.htmlBody && (
                              <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                                <button
                                  type="button"
                                  onClick={() => setViewMode("html")}
                                  className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                                    viewMode === "html" 
                                      ? "bg-white text-[#003366] shadow-xs" 
                                      : "text-slate-500 hover:text-slate-800"
                                  }`}
                                >
                                  Mock de E-mail (HTML)
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setViewMode("text")}
                                  className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                                    viewMode === "text" 
                                      ? "bg-white text-[#003366] shadow-xs" 
                                      : "text-slate-500 hover:text-slate-800"
                                  }`}
                                >
                                  Texto Puro
                                </button>
                              </div>
                            )}
                          </div>

                          {viewMode === "html" && log.htmlBody ? (
                            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[380px] overflow-y-auto bg-slate-50 p-2">
                              {/* Safely injected styled credentials preview inside iframe container style or div */}
                              <div 
                                className="scale-[0.85] origin-top transform my-2"
                                dangerouslySetInnerHTML={{ __html: log.htmlBody }} 
                              />
                            </div>
                          ) : (
                            <div className="p-4 text-xs text-slate-700 bg-slate-50/50 border border-slate-100 rounded-xl text-left leading-relaxed whitespace-pre-wrap font-sans max-h-[200px] overflow-y-auto">
                              {log.body}
                            </div>
                          )}
                        </div>

                        {/* Attached Physical Badge Preview Area */}
                        {log.type === "approval" ? (
                          <div className="border-t border-dashed border-slate-200 pt-4 mt-2">
                            <div className="bg-[#003366]/5 border border-[#003366]/15 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                              <div className="flex items-center gap-3 text-left">
                                <div className="p-2 bg-emerald-50 border border-emerald-250 text-emerald-600 rounded-lg shrink-0">
                                  <QrCode className="h-5 w-5" />
                                </div>
                                <div>
                                  <h4 className="font-display font-extrabold text-xs text-[#003366] uppercase">Anexo: Credencial Oficial com QR Code Gerada</h4>
                                  <p className="text-[10px] text-slate-500 leading-tight block">
                                    Esta credencial possui as dimensões físicas padronizadas (85mm x 135mm) para impressão e uso de correia.
                                  </p>
                                </div>
                              </div>
                              
                              {/* Open Badge inside the mailbox view directly */}
                              <button
                                onClick={() => {
                                  // Resolve the full request with its high-quality profile photo from the main database list
                                  const fullRequest = requests.find((r) => r.id === log.request?.id) || log.request;
                                  setViewingBadge(fullRequest);
                                }}
                                className="px-4 py-2 bg-[#003366] hover:bg-[#002244] text-white text-xs font-bold rounded-lg transition-all shadow-3xs cursor-pointer flex items-center gap-1.5 shrink-0"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                <span>Visualizar Credencial Real</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="border-t border-dashed border-slate-150 pt-4 text-center text-xs text-slate-400 italic">
                            Esta notificação não acompanha credencial de liberação (solicitação recusada pelo SESMT).
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Post-Visit Google Feedback Form Simulator Modal */}
      {showFeedbackSimulator && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in text-slate-800 shadow-2xl">
          <div className="bg-[#f0ebf8] border border-purple-200 w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            
            {/* Header stylized like Google Forms purple theme */}
            <div className="bg-[#673ab7] p-5 text-white space-y-2 relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-purple-900" />
              <h3 className="font-display font-black text-lg sm:text-xl flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-purple-200" />
                Formulário de Feedback Wilson Sons
              </h3>
              <p className="text-[11px] text-purple-100 font-medium">
                Pesquisa pós-visita para aferir organização, segurança e aproveitamento coletivo.
              </p>
            </div>

            {/* Simulated environment warning banner */}
            <div className="bg-amber-50 text-amber-850 p-3 border-b border-amber-200 text-[10px] md:text-[11px] font-bold leading-normal flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shrink-0" />
              Simulando resposta para a visita realizada por **{showFeedbackSimulator.fullName}** representante da **{showFeedbackSimulator.organization}** no dia **{showFeedbackSimulator.scheduledDate.split("-").reverse().join("/")}**.
            </div>

            <form onSubmit={handleFeedbackSimulatorSubmit} className="p-6 overflow-y-auto space-y-5 bg-slate-50 flex-1 text-xs">
              
              {/* Question 1: Organization Rating */}
              <div className="bg-white p-4.5 rounded-xl border border-slate-200 space-y-2">
                <label className="font-bold text-slate-800 block text-[13px]">
                  1. Como você avalia a organização logística geral da visita Wilson Sons? *
                </label>
                <div className="flex items-center gap-2 pt-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setFeedbackOrgRating(star)}
                      className="p-1 hover:scale-115 transition-transform cursor-pointer"
                    >
                      <Star 
                        className={`h-7 w-7 ${
                          star <= feedbackOrgRating 
                            ? "text-orange-500 fill-orange-500" 
                            : "text-slate-200"
                        }`} 
                      />
                    </button>
                  ))}
                  <span className="text-[11px] text-slate-450 font-bold ml-2">({feedbackOrgRating}/5 estrelas)</span>
                </div>
              </div>

              {/* Question 2: Safety Rating */}
              <div className="bg-white p-4.5 rounded-xl border border-slate-200 space-y-2">
                <label className="font-bold text-slate-800 block text-[13px]">
                  2. A conscientização de EPIs e regras do SESMT foi clara e efetivamente aplicada? *
                </label>
                <div className="flex items-center gap-2 pt-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setFeedbackSafetyRating(star)}
                      className="p-1 hover:scale-115 transition-transform cursor-pointer"
                    >
                      <Star 
                        className={`h-7 w-7 ${
                          star <= feedbackSafetyRating 
                            ? "text-emerald-500 fill-emerald-500" 
                            : "text-slate-200"
                        }`} 
                      />
                    </button>
                  ))}
                  <span className="text-[11px] text-slate-450 font-bold ml-2">({feedbackSafetyRating}/5 estrelas)</span>
                </div>
              </div>

              {/* Question 3: Usefulness Rating */}
              <div className="bg-white p-4.5 rounded-xl border border-slate-200 space-y-2">
                <label className="font-bold text-slate-800 block text-[13px]">
                  3. Qual foi o nível de utilidade prática e técnica da visita para seu objetivo? *
                </label>
                <div className="flex items-center gap-2 pt-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setFeedbackUsefulnessRating(star)}
                      className="p-1 hover:scale-115 transition-transform cursor-pointer"
                    >
                      <Star 
                        className={`h-7 w-7 ${
                          star <= feedbackUsefulnessRating 
                            ? "text-indigo-600 fill-indigo-600" 
                            : "text-slate-200"
                        }`} 
                      />
                    </button>
                  ))}
                  <span className="text-[11px] text-slate-450 font-bold ml-2">({feedbackUsefulnessRating}/5 estrelas)</span>
                </div>
              </div>

              {/* Question 4: Comments text */}
              <div className="bg-white p-4.5 rounded-xl border border-slate-200 space-y-2">
                <label className="font-bold text-slate-800 block text-[13px]">
                  4. Descreva suas observações gerais de melhoria ou relatos de conformidade: *
                </label>
                <textarea
                  rows={3}
                  required
                  value={feedbackComments}
                  onChange={(e) => setFeedbackComments(e.target.value)}
                  placeholder="Deixe suas considerações ou reporte se todas as regras de EPI e instruções de pátio foram cumpridas pelas equipes acompanhantes."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs placeholder-slate-400 focus:outline-hidden focus:border-purple-500 focus:bg-white font-medium"
                />
              </div>

              {/* Buttons bar */}
              <div className="flex justify-end gap-2 font-bold pt-1.5">
                <button
                  type="button"
                  onClick={() => setShowFeedbackSimulator(null)}
                  className="px-4 py-2.5 bg-slate-200 text-slate-700 hover:bg-slate-300 rounded-lg transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#673ab7] hover:bg-[#512da8] text-white rounded-lg shadow-sm font-extrabold flex items-center gap-1 cursor-pointer"
                >
                  <Send className="h-4 w-4" />
                  Enviar Resposta para a Planilha
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dynamic Pop-up Modal overlay for standard Virtual Badge visualizing across tabs */}
      {viewingBadge && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-55 overflow-y-auto animate-fade-in print:p-0">
          <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
            <VirtualBadge 
              request={viewingBadge} 
              onClose={() => setViewingBadge(null)} 
            />
          </div>
        </div>
      )}

    </div>
  );
}

function InboxEmptyPlaceholder() {
  return (
    <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0a2 2 0 01-2 2H6a2 2 0 01-2-2m16 0l-3.586-3.586a2 2 0 00-2.828 0L16 12M4 13l3.586-3.586a2 2 0 012.828 0L12 11" />
    </svg>
  );
}
