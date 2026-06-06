import { VisitRequest, VisitStatus, FeedbackResponse } from "../types";

export const INITIAL_MOCK_REQUESTS: VisitRequest[] = [
  {
    id: "WS-REQ-000",
    fullName: "Marcos Aurélio Silveira",
    cpf: "111.555.999-88",
    email: "marcos.silveira@portoaustral.com",
    phone: "(27) 99341-2288",
    organization: "Porto Austral Logística",
    cityState: "Vitória - ES",
    visitorCount: 3,
    scheduledDate: "2026-05-15", // Past visit
    purpose: "Visita de intercâmbio operacional para conhecer os rebocadores e os guindastes móveis STS.",
    status: VisitStatus.APPROVED,
    submissionDate: "2026-05-01",
    securityCleared: true,
    securityConsentDate: "2026-05-01T10:14:00Z",
    aiSuggestions: "### 💡 Pontos de Interesse Wilson Sons recomendados\n- **Frota de Rebocadores de Apoio Portuário**: Perfeito para o alinhamento de intercâmbio de práticas de manobra e atracação.\n- **Tecon Salvador/Rio Grande**: Agendar visita técnica acompanhada ao CCO para analisar os sistemas de despacho dos guindastes móveis STS.\n\n### 🕒 Recomendação de Horário e Logística\nSugerido turno da tarde entre 14:00 e 16:30 para observar a operação real de atracação com calado favorável.\n\n### 🛡️ Precauções Específicas de Segurança\nObrigatório o uso de botas de biqueira de aço, óculos escuros de segurança UV e capacete com jugular no pátio de containers.",
    feedbackSent: true,
    feedbackSentDate: "2026-05-16T09:00:00Z"
  },
  {
    id: "WS-REQ-001",
    fullName: "Carlos Eduardo Santos Silva",
    cpf: "123.456.789-00",
    email: "carlos.silva@navalcorp.com.br",
    phone: "(21) 98765-4321",
    organization: "NavalCorp Logística",
    cityState: "Rio de Janeiro - RJ",
    visitorCount: 4,
    scheduledDate: "2026-06-15", // Future visit
    purpose: "Visita técnica de alinhamento operacional para descarga de containers de cargas sobredimensionadas.",
    status: VisitStatus.APPROVED,
    submissionDate: "2026-05-28",
    securityCleared: true,
    securityConsentDate: "2026-05-28T14:32:00Z",
    aiSuggestions: "### 💡 Pontos de Interesse Wilson Sons recomendados\n- **Tecon Rio Grande / Tecon Salvador**: Sugerimos focar no gate portuário e no terminal de descarga, onde operam os guindastes cargueiros pesados para otimização espacial do layout de mercadorias sobredimensionadas.\n- **CCO (Centro de Controle Operacional)**: Para examinar a documentação alfandegária digital em tempo real.\n\n### 🕒 Recomendação de Horário e Logística\nAgendar preferencialmente no meio de semana (Terça ou Quarta-feira) no turno da manhã (09:00 - 11:30), minimizando tempo de espera nas instâncias alfandegárias durante picos de navios porta-containeres.\n\n### 🛡️ Precauções Específicas de Segurança\nObrigatório o uso de colete refletivo classe 2 de cor laranja devido ao fluxo intenso de carretas pesadas nas proximidades do terminal de descarga."
  },
  {
    id: "WS-REQ-002",
    fullName: "Mariana Alencar Guimarães",
    cpf: "987.654.321-11",
    email: "mariana.g@ufrj.br",
    phone: "(21) 99123-5566",
    organization: "Universidade Federal do Rio de Janeiro (UFRJ)",
    cityState: "Rio de Janeiro - RJ",
    visitorCount: 15,
    scheduledDate: "2026-06-22",
    purpose: "Visita acadêmica com estudantes de Engenharia Naval para conhecer o estaleiro e controle de rebocadores.",
    status: VisitStatus.PENDING,
    submissionDate: "2026-06-01",
    securityCleared: true,
    securityConsentDate: "2026-06-01T09:12:15Z"
  },
  {
    id: "WS-REQ-003",
    fullName: "Ricardo Barbosa Mendes",
    cpf: "456.789.012-33",
    email: "ricardo.mendes@portobrasil.org",
    phone: "(27) 98111-2233",
    organization: "Associação Portuária Brasil",
    cityState: "Vitória - ES",
    visitorCount: 2,
    scheduledDate: "2026-06-10",
    status: VisitStatus.PENDING,
    purpose: "Estudo comparativo de eficiência logística portuária e novos guindastes móveis STS.",
    submissionDate: "2026-06-02",
    securityCleared: true,
    securityConsentDate: "2026-06-02T16:22:40Z"
  },
  {
    id: "WS-REQ-004",
    fullName: "Ana Beatriz de Oliveira",
    cpf: "111.222.333-44",
    email: "anabeatriz@energiamarinha.com",
    phone: "(11) 97766-8899",
    organization: "MarAzul Pesquisas Oceânicas",
    cityState: "Santos - SP",
    visitorCount: 6,
    scheduledDate: "2026-05-25", // Past visit, but rejected
    purpose: "Visita de inspeção ambiental prévia para credenciamento de rebocadores híbridos.",
    status: VisitStatus.REJECTED,
    submissionDate: "2026-05-20",
    securityCleared: true,
    securityConsentDate: "2026-05-20T11:05:12Z",
    rejectionReason: "Problemas na documentação complementar ambiental apresentada."
  }
];

export const INITIAL_MOCK_FEEDBACKS: FeedbackResponse[] = [
  {
    id: "FB-001",
    requestId: "WS-REQ-000",
    visitorName: "Marcos Aurélio Silveira",
    organization: "Porto Austral Logística",
    visitDate: "2026-05-15",
    organizationRating: 5,
    safetyRating: 5,
    usefulnessRating: 5,
    comments: "Visita impecável e muito produtiva. A equipe de segurança foi extremamente rigorosa e atenciosa com o treinamento de EPI. O Centro de Controle Operacional nos deu excelentes ideias para o nosso terminal.",
    submissionDate: "2026-05-16"
  }
];

const LOCAL_STORAGE_KEY = "wilson_sons_visits";
const FEEDBACK_STORAGE_KEY = "wilson_sons_feedbacks";

export function getStoredRequests(): VisitRequest[] {
  const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!stored) {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(INITIAL_MOCK_REQUESTS));
    } catch (e) {
      console.warn("Falha ao salvar solicitações iniciais no localStorage:", e);
    }
    return INITIAL_MOCK_REQUESTS;
  }
  try {
    return JSON.parse(stored);
  } catch (e) {
    return INITIAL_MOCK_REQUESTS;
  }
}

export function saveStoredRequests(requests: VisitRequest[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(requests));
  } catch (e) {
    console.error("Erro ao salvar solicitações no localStorage (Cota de disco cheia):", e);
  }
}

export function getStoredFeedbacks(): FeedbackResponse[] {
  const stored = localStorage.getItem(FEEDBACK_STORAGE_KEY);
  if (!stored) {
    try {
      localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(INITIAL_MOCK_FEEDBACKS));
    } catch (e) {
      console.warn("Falha ao salvar feedbacks iniciais no localStorage:", e);
    }
    return INITIAL_MOCK_FEEDBACKS;
  }
  try {
    return JSON.parse(stored);
  } catch (e) {
    return INITIAL_MOCK_FEEDBACKS;
  }
}

export function saveStoredFeedbacks(feedbacks: FeedbackResponse[]): void {
  try {
    localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(feedbacks));
  } catch (e) {
    console.error("Erro ao salvar feedbacks no localStorage (Cota de disco cheia):", e);
  }
}
