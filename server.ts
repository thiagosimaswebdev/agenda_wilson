import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import fs from "fs";
import nodemailer from "nodemailer";

dotenv.config();

// Initialize Gemini client securely server-side
const apiKey = process.env.GEMINI_API_KEY;
let aiClient: GoogleGenAI | null = null;

function isApiKeyFake(key: string | undefined): boolean {
  if (!key) return true;
  const k = key.trim();
  if (
    k === "" || 
    k === "MY_GEMINI_API_KEY" || 
    k === "MOCK_KEY_IF_ABSENT" || 
    k === "TODO" || 
    k === "placeholder" || 
    k === "YOUR_GEMINI_API_KEY" ||
    k === "your-api-key"
  ) {
    return true;
  }
  if (!k.startsWith("AIza")) return true;
  return false;
}

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    if (!apiKey) {
      console.warn("WARNING: GEMINI_API_KEY is not defined in environment variables.");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey || "MOCK_KEY_IF_ABSENT",
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON parser
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  const configPath = path.join(process.cwd(), "form-config.json");

  function readConfig() {
    const baseDefaults = {
      googleFormsUrl: "https://docs.google.com/forms/d/e/1FAIpQLSdha_LdNmV5ooGmcaG0tdOMczd8Xn1EvaOFE-KAri2f_pEezg/viewform",
      mappings: {
        fullName: "entry.731264085",
        cpf: "entry.1836314584",
        email: "entry.1898895614",
        phone: "entry.1320066586",
        organization: "entry.613409940",
        cityState: "entry.1646761464",
        visitorCount: "entry.1943855474",
        scheduledDate: "entry.666260665",
        purpose: "entry.1129131450"
      },
      smtpHost: "smtp.gmail.com",
      smtpPort: "587",
      smtpUser: "simasthiago85@gmail.com",
      smtpPass: "amqw qcyb exav uwcy",
      smtpFrom: "sesmt@wilsonsons.com.br"
    };

    try {
      if (fs.existsSync(configPath)) {
        const data = fs.readFileSync(configPath, "utf-8");
        const parsed = JSON.parse(data);
        return {
          ...baseDefaults,
          ...parsed,
          mappings: {
            ...baseDefaults.mappings,
            ...(parsed.mappings || {})
          }
        };
      }
    } catch (e) {
      console.error("Erro ao ler form-config.json:", e);
    }
    return baseDefaults;
  }

  function saveConfig(newConfig: any) {
    try {
      const existing = readConfig();
      const merged = { ...existing, ...newConfig };
      fs.writeFileSync(configPath, JSON.stringify(merged, null, 2), "utf-8");
      return true;
    } catch (e) {
      console.error("Erro ao salvar form-config.json:", e);
      return false;
    }
  }

  // Memory Cache for dynamic live mapping resolution, to avoid scraping Google Forms on every single submission
  let cachedMappings: Record<string, string> | null = null;
  let cachedUrl: string | null = null;
  let lastScrapeTime = 0;
  const CACHE_TTL = 30 * 60 * 1000; // Cache valid for 30 minutes

  // Extremely robust HTML parser that leverages multiple strategies to detect entry.XXXX keys and map them to fields
  function extractMappingsFromHtml(html: string): { suggestedMappings: Record<string, string>, extractedFields: any[] } {
    const suggestedMappings: Record<string, string> = {};
    const extractedFields: any[] = [];
    const foundEntryIds = new Set<string>();

    // Strategy 1: Scan for all entry.XXXX matches anywhere in the string
    const directEntryRegex = /(?:entry[._]?)(\d{7,11})\b/gi;
    let directMatch;
    while ((directMatch = directEntryRegex.exec(html)) !== null) {
      foundEntryIds.add(directMatch[1]);
    }

    const inputRegex = /name="entry\.(\d+)"/g;
    let inputMatch;
    while ((inputMatch = inputRegex.exec(html)) !== null) {
      foundEntryIds.add(inputMatch[1]);
    }

    // Strategy 2: Bracket-balanced FB_PUBLIC_APP_DATA extraction (like our advanced AdminPanel algorithm)
    let fbAppString = "";
    const fbIdx = html.indexOf("FB_PUBLIC_APP_DATA");
    if (fbIdx !== -1) {
      const startBracketIdx = html.indexOf("[", fbIdx);
      if (startBracketIdx !== -1) {
        let bracketCount = 0;
        let inString = false;
        let stringChar = '';
        let escaped = false;
        for (let i = startBracketIdx; i < html.length; i++) {
          const char = html[i];
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
              fbAppString = html.slice(startBracketIdx, i + 1);
              break;
            }
          }
        }
      }
    }

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
            extractedFields.push({ id: field[0] || strEntryId, title: String(title), type, entryId: strEntryId });
            foundEntryIds.delete(strEntryId);
          }
        }
      } catch (e) {
        console.error("Wilson Sons – Erro ao processar FB_PUBLIC_APP_DATA em tempo real:", e);
      }
    }

    // Strategy 3: Structure-based Regex patterns inside raw HTML layout
    const rawFieldPattern = /\[\s*(\d{7,12})\s*,\s*"([^"\\]*(?:\\.[^"\\]*)*)"\s*,[^,]*,\s*\d+\s*,\s*\[\s*\[\s*(\d{7,12})/g;
    let rawFm;
    while ((rawFm = rawFieldPattern.exec(html)) !== null) {
      const fieldId = rawFm[1];
      const title = rawFm[2].replace(/\\"/g, '"');
      const entryId = rawFm[3];
      if (!extractedFields.some((f) => f.entryId === entryId)) {
        extractedFields.push({
          id: fieldId,
          title: title,
          type: "Campo Estruturado",
          entryId: entryId
        });
        foundEntryIds.delete(entryId);
      }
    }

    // Strategy 4: Handle leftover detected entries by guessing from surrounding context
    foundEntryIds.forEach((entryId) => {
      let title = `Campo numérico entry.${entryId}`;
      const index = html.indexOf(entryId);
      if (index !== -1) {
        const surrounding = html.slice(Math.max(0, index - 250), index);
        const labelMatch = surrounding.match(/"([^"]{3,40})"/g);
        if (labelMatch && labelMatch.length > 0) {
          title = labelMatch[labelMatch.length - 1].replace(/"/g, '');
        }
      }
      extractedFields.push({
        id: entryId,
        title: title,
        type: "Detecção por Varrer HTML",
        entryId: entryId
      });
    });

    // Strategy 5: Translate titles and map into keys (Portuguese & English support)
    for (const field of extractedFields) {
      const titleLower = field.title ? String(field.title).toLowerCase() : "";
      const key = `entry.${field.entryId}`;

      if (titleLower.includes("nome") || titleLower.includes("name") || titleLower.includes("completo") || titleLower.includes("solicitante")) {
        suggestedMappings["fullName"] = key;
      } else if (titleLower.includes("cpf") || titleLower.includes("documento") || titleLower.includes("cadastro de pessoa")) {
        suggestedMappings["cpf"] = key;
      } else if (titleLower.includes("email") || titleLower.includes("e-mail") || titleLower.includes("correio") || titleLower.includes("mail")) {
        suggestedMappings["email"] = key;
      } else if (titleLower.includes("telefone") || titleLower.includes("celular") || titleLower.includes("whatsapp") || titleLower.includes("contato") || titleLower.includes("phone") || titleLower.includes("tel") || titleLower.includes("wpp") || titleLower.includes("cel")) {
        suggestedMappings["phone"] = key;
      } else if (titleLower.includes("empresa") || titleLower.includes("institu") || titleLower.includes("organiza") || titleLower.includes("company") || titleLower.includes("corporação") || titleLower.includes("órgão")) {
        suggestedMappings["organization"] = key;
      } else if (titleLower.includes("cidade") || titleLower.includes("estado") || titleLower.includes("origem") || titleLower.includes("uf") || titleLower.includes("city") || titleLower.includes("localidade")) {
        suggestedMappings["cityState"] = key;
      } else if (titleLower.includes("quantidade") || titleLower.includes("visitantes") || titleLower.includes("pessoas") || titleLower.includes("pax") || titleLower.includes("integrantes") || titleLower.includes("count") || titleLower.includes("membros") || titleLower.includes("número de")) {
        suggestedMappings["visitorCount"] = key;
      } else if (titleLower.includes("data") || titleLower.includes("período") || titleLower.includes("dia") || titleLower.includes("date") || titleLower.includes("agenda")) {
        suggestedMappings["scheduledDate"] = key;
      } else if (titleLower.includes("objetivo") || titleLower.includes("fins") || titleLower.includes("motivo") || titleLower.includes("mensagem") || titleLower.includes("detalhado") || titleLower.includes("purpose") || titleLower.includes("assunto") || titleLower.includes("justificativa")) {
        suggestedMappings["purpose"] = key;
      }
    }

    return { suggestedMappings, extractedFields };
  }

  async function scrapeFormFieldsFromUrl(urlToScrape: string) {
    console.log(`Wilson Sons – Baixando HTML para mapear: ${urlToScrape}`);
    const response = await fetch(urlToScrape, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });
    if (!response.ok) {
      throw new Error(`Conexão frustrada com o Google Forms: ${response.status}`);
    }
    const html = await response.text();
    return extractMappingsFromHtml(html);
  }

  // Self-healing function that merges configured settings with live-scraped keys so the site auto-repairs itself
  async function getOrResolveMappings(googleFormsUrl: string, fallbackMappings: Record<string, string>): Promise<Record<string, string>> {
    // Check if fallbackMappings already has all the required keys well-mapped
    const requiredKeys = ["fullName", "cpf", "email", "phone", "organization", "cityState", "visitorCount", "scheduledDate", "purpose"];
    const hasAllKeysMapped = requiredKeys.every(key => {
      const val = fallbackMappings[key];
      return val && val.startsWith("entry.") && !val.startsWith("entry.dummy");
    });

    if (hasAllKeysMapped) {
      console.log("Wilson Sons – Todos os campos já possuem mapeamento válido no disco. Pulando o scraping em tempo real para máxima velocidade e confiabilidade.");
      return fallbackMappings;
    }

    const now = Date.now();
    // 1. Check if we have dynamic mappings cached in memory
    if (cachedMappings && cachedUrl === googleFormsUrl && (now - lastScrapeTime < CACHE_TTL)) {
      console.log("Wilson Sons – Usando mapeamentos resolve-cache em memória");
      return { ...fallbackMappings, ...cachedMappings };
    }

    try {
      console.log(`Wilson Sons – Resolvendo mapeamentos em tempo real: ${googleFormsUrl}`);
      const data = await scrapeFormFieldsFromUrl(googleFormsUrl);
      const scraped = data.suggestedMappings;
      const foundCount = Object.keys(scraped).length;

      if (foundCount > 0) {
        console.log(`Wilson Sons – Mapeamento autofix resolvido! Detectados ${foundCount} campos no formulário ao vivo.`);
        cachedMappings = scraped;
        cachedUrl = googleFormsUrl;
        lastScrapeTime = now;

        // Save resolving dynamic cache to disk so it stays persistent on next fast request
        const mergedMappings = { ...fallbackMappings };
        for (const [key, value] of Object.entries(scraped)) {
          if (value && (!mergedMappings[key] || mergedMappings[key].startsWith("entry.dummy") || mergedMappings[key] === "")) {
            mergedMappings[key] = value;
          }
        }
        
        // Auto persistent save ONLY if we didn't wipe out any correct mappings with empty entries
        const hasNowMappedAll = requiredKeys.every(key => mergedMappings[key] && mergedMappings[key] !== "");
        if (hasNowMappedAll) {
          saveConfig({ googleFormsUrl, mappings: mergedMappings });
        }
        return mergedMappings;
      }
    } catch (err: any) {
      console.warn("Wilson Sons [ALERTA] – Falha na resolução dinâmica de mapeamentos:", err.message);
    }

    // Default return fallback mapped fields from disk if real-time fetch fails
    return fallbackMappings;
  }

  // Endpoints to get/post Google Forms Link configurations
  app.get("/api/config", async (req, res) => {
    const config = readConfig();
    try {
      // Always try to dynamically resolve or enrich mapping before returning
      const resolvedMappings = await getOrResolveMappings(config.googleFormsUrl, config.mappings);
      return res.json({
        googleFormsUrl: config.googleFormsUrl,
        mappings: resolvedMappings,
        smtpHost: config.smtpHost || "",
        smtpPort: config.smtpPort || "",
        smtpUser: config.smtpUser || "",
        smtpPass: config.smtpPass || "",
        smtpFrom: config.smtpFrom || ""
      });
    } catch (e) {
      return res.json({
        ...config,
        smtpHost: config.smtpHost || "",
        smtpPort: config.smtpPort || "",
        smtpUser: config.smtpUser || "",
        smtpPass: config.smtpPass || "",
        smtpFrom: config.smtpFrom || ""
      });
    }
  });

  app.post("/api/config", (req, res) => {
    const { 
      googleFormsUrl, 
      mappings, 
      smtpHost, 
      smtpPort, 
      smtpUser, 
      smtpPass, 
      smtpFrom 
    } = req.body;

    const configToUpdate: any = {};
    if (googleFormsUrl !== undefined) configToUpdate.googleFormsUrl = googleFormsUrl;
    if (mappings !== undefined) configToUpdate.mappings = mappings;
    if (smtpHost !== undefined) configToUpdate.smtpHost = smtpHost;
    if (smtpPort !== undefined) configToUpdate.smtpPort = smtpPort;
    if (smtpUser !== undefined) configToUpdate.smtpUser = smtpUser;
    if (smtpPass !== undefined) configToUpdate.smtpPass = smtpPass;
    if (smtpFrom !== undefined) configToUpdate.smtpFrom = smtpFrom;

    const success = saveConfig(configToUpdate);
    
    // Invalidate/reset the memory cache upon explicit updates
    if (mappings !== undefined) cachedMappings = mappings || null;
    if (googleFormsUrl !== undefined) cachedUrl = googleFormsUrl;
    lastScrapeTime = Date.now();

    return res.json({ success });
  });

  // Test and diagnose SMTP connectivity and credentials details
  app.post("/api/test-smtp", async (req, res) => {
    const { smtpHost, smtpPort, smtpUser, smtpPass } = req.body;
    
    if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
      return res.status(400).json({ success: false, error: "Dados incompletos para testar conectividade." });
    }

    const host = smtpHost.trim();
    const port = parseInt(smtpPort);
    const user = smtpUser.trim();
    let pass = smtpPass;

    // Sanitize pass for Gmail / 16 chars App Password
    if (pass) {
      const trimmedPass = pass.trim();
      const strippedPass = trimmedPass.replace(/\s+/g, "");
      if (
        (strippedPass.length === 16 && /^[a-zA-Z]+$/.test(strippedPass)) ||
        host.includes("gmail") || 
        host.includes("google")
      ) {
        pass = strippedPass;
      } else {
        pass = trimmedPass;
      }
    }

    try {
      let transportOpts: any = {
        host: host,
        port: port,
        secure: port === 465, // true for 465, false for other ports
        auth: {
          user: user,
          pass: pass,
        },
        tls: {
          rejectUnauthorized: false
        },
        connectionTimeout: 5000, 
        greetingTimeout: 4000,   
        socketTimeout: 8000      
      };

      // If it's a Gmail/Google host, use service: 'gmail' for ultra-robust authentication handshake
      if (host.includes("gmail") || host.includes("google")) {
        transportOpts = {
          service: "gmail",
          auth: {
            user: user,
            pass: pass,
          },
          tls: {
            rejectUnauthorized: false
          }
        };
      }

      console.log(`[SMTP TEST] Attempting verification for host: ${host}:${port} with user: ${user}`);
      const transporter = nodemailer.createTransport(transportOpts);
      await transporter.verify();
      
      console.log("[SMTP TEST] Verification successful!");
      return res.json({ success: true, message: "Conexão com o servidor SMTP efetuada de forma autêntica e bem-sucedida!" });
    } catch (err: any) {
      console.error("[SMTP TEST ERROR] Verification failed:", err);
      let customError = err.message;
      if (err.message.includes("535") || err.message.toLowerCase().includes("badcredentials") || err.message.toLowerCase().includes("invalid login")) {
        customError = "Credenciais inválidas (Erro 535). Certifique-se de que a Verificação em Duas Etapas esteja ativada na sua conta Google e de fato crie uma 'Senha de App' de 16 letras, inserindo-a sem espaços.";
      } else if (err.code === "ETIMEDOUT" || err.code === "ECONNREFUSED") {
        customError = `Tempo limite esgotado ou conexão recusada (${err.code}). O host ${host} na porta ${port} não respondeu ou sua infraestrutura/firewall está bloqueando a porta.`;
      }
      return res.json({ success: false, error: customError, code: err.code || "UNKNOWN" });
    }
  });

  // Scraping debugger endpoint
  app.post("/api/test-scrape", async (req, res) => {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ success: false, error: "A URL do Google Forms é obrigatória." });
    }
    try {
      const data = await scrapeFormFieldsFromUrl(url);
      return res.json({ success: true, ...data });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Backward compatibility mock
  app.get("/api/test-mapping", async (req, res) => {
    try {
      const config = readConfig();
      const data = await scrapeFormFieldsFromUrl(config.googleFormsUrl);
      return res.json({
        success: true,
        extractedFields: data.extractedFields,
        mappedKeys: config.mappings
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  const registrationsPath = path.join(process.cwd(), "registrations.json");
  const feedbacksPath = path.join(process.cwd(), "feedbacks.json");

  // Initial mock requests for server seed
  const INITIAL_MOCK_REQUESTS_SERVER = [
    {
      id: "WS-REQ-000",
      fullName: "Marcos Aurélio Silveira",
      cpf: "111.555.999-88",
      email: "marcos.silveira@portoaustral.com",
      phone: "(27) 99341-2288",
      organization: "Porto Austral Logística",
      cityState: "Vitória - ES",
      visitorCount: 3,
      scheduledDate: "2026-05-15",
      purpose: "Visita de intercâmbio operacional para conhecer os rebocadores e os guindastes móveis STS.",
      status: "APPROVED",
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
      scheduledDate: "2026-06-15",
      purpose: "Visita técnica de alinhamento operacional para descarga de containers de cargas sobredimensionadas.",
      status: "APPROVED",
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
      status: "PENDING",
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
      status: "PENDING",
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
      scheduledDate: "2026-05-25",
      purpose: "Visita de inspeção ambiental prévia para credenciamento de rebocadores híbridos.",
      status: "REJECTED",
      submissionDate: "2026-05-20",
      securityCleared: true,
      securityConsentDate: "2026-05-20T11:05:12Z",
      rejectionReason: "Problemas na documentação complementar ambiental apresentada."
    }
  ];

  const INITIAL_MOCK_FEEDBACKS_SERVER = [
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

  function readRegistrations() {
    try {
      if (fs.existsSync(registrationsPath)) {
        const data = fs.readFileSync(registrationsPath, "utf-8");
        return JSON.parse(data);
      }
    } catch (e) {
      console.error("Erro ao ler registrations.json:", e);
    }
    // Initialize if doesn't exist
    try {
      fs.writeFileSync(registrationsPath, JSON.stringify(INITIAL_MOCK_REQUESTS_SERVER, null, 2), "utf-8");
    } catch (_) {}
    return INITIAL_MOCK_REQUESTS_SERVER;
  }

  function writeRegistrations(data: any) {
    try {
      fs.writeFileSync(registrationsPath, JSON.stringify(data, null, 2), "utf-8");
      return true;
    } catch (e) {
      console.error("Erro ao salvar registrations.json:", e);
      return false;
    }
  }

  function readFeedbacks() {
    try {
      if (fs.existsSync(feedbacksPath)) {
        const data = fs.readFileSync(feedbacksPath, "utf-8");
        return JSON.parse(data);
      }
    } catch (e) {
      console.error("Erro ao ler feedbacks.json:", e);
    }
    // Initialize if doesn't exist
    try {
      fs.writeFileSync(feedbacksPath, JSON.stringify(INITIAL_MOCK_FEEDBACKS_SERVER, null, 2), "utf-8");
    } catch (_) {}
    return INITIAL_MOCK_FEEDBACKS_SERVER;
  }

  function writeFeedbacks(data: any) {
    try {
      fs.writeFileSync(feedbacksPath, JSON.stringify(data, null, 2), "utf-8");
      return true;
    } catch (e) {
      console.error("Erro ao salvar feedbacks.json:", e);
      return false;
    }
  }

  // Endpoints for registrations/requests
  app.get("/api/requests", (req, res) => {
    return res.json(readRegistrations());
  });

  app.post("/api/requests", (req, res) => {
    const newRequest = req.body;
    const current = readRegistrations();
    // Check if duplicate already exists (e.g., recorded on Google Form submission capture)
    const duplicateIndex = current.findIndex((r: any) => r.cpf === newRequest.cpf && r.scheduledDate === newRequest.scheduledDate);
    if (duplicateIndex !== -1) {
      current[duplicateIndex] = {
        ...current[duplicateIndex],
        ...newRequest,
        visitorPhoto: newRequest.visitorPhoto || current[duplicateIndex].visitorPhoto,
        aiSuggestions: newRequest.aiSuggestions || current[duplicateIndex].aiSuggestions
      };
      writeRegistrations(current);

      console.log(`[Auto-Confirmation] Duplicado recebido para ${current[duplicateIndex].id} – Atualizado no banco, e-mail de confirmação já enviado anteriormente.`);

      return res.json({ success: true, request: current[duplicateIndex], message: "Duplicate updated with photo/suggestions" });
    }
    const updated = [newRequest, ...current];
    writeRegistrations(updated);

    // Send automatic registration confirmation email
    sendNotificationEmail(newRequest, "PENDING")
      .then((resp) => console.log(`[Auto-Confirmation] Sent confirmation email for ${newRequest.id} to ${newRequest.email}:`, resp.message))
      .catch((err) => console.error(`[Auto-Confirmation] Failed to send email for ${newRequest.id}:`, err));

    return res.json({ success: true, request: newRequest });
  });

  app.put("/api/requests/:id", (req, res) => {
    const { id } = req.params;
    const updatedFields = req.body;
    const current = readRegistrations();
    const updated = current.map((r: any) => {
      if (r.id === id) {
        return { ...r, ...updatedFields };
      }
      return r;
    });
    writeRegistrations(updated);
    return res.json({ success: true });
  });

  app.delete("/api/requests/:id", (req, res) => {
    const { id } = req.params;
    const current = readRegistrations();
    const updated = current.filter((r: any) => r.id !== id);
    writeRegistrations(updated);
    return res.json({ success: true });
  });

  app.post("/api/reset-requests", (req, res) => {
    writeRegistrations(INITIAL_MOCK_REQUESTS_SERVER);
    writeFeedbacks(INITIAL_MOCK_FEEDBACKS_SERVER);
    return res.json({ success: true, requests: INITIAL_MOCK_REQUESTS_SERVER, feedbacks: INITIAL_MOCK_FEEDBACKS_SERVER });
  });

  // Endpoints for feedbacks
  app.get("/api/feedbacks", (req, res) => {
    return res.json(readFeedbacks());
  });

  app.post("/api/feedbacks", (req, res) => {
    const newFeedback = req.body;
    const current = readFeedbacks();
    const updated = [newFeedback, ...current];
    writeFeedbacks(updated);
    return res.json({ success: true, feedback: newFeedback });
  });

  // API to submit the integrated form data directly to Google Forms (Sheets)
  app.post("/api/submit-to-google-form", async (req, res) => {
    const { 
      fullName, 
      cpf, 
      email, 
      phone, 
      organization, 
      cityState, 
      visitorCount, 
      scheduledDate, 
      purpose,
      visitorPhoto
    } = req.body;

    try {
      const config = readConfig();
      
      // Dynamic, real-time matching resolve! Guarantees the mappings are always fresh and active
      const mappings = await getOrResolveMappings(config.googleFormsUrl, config.mappings);
      
      const formParams = new URLSearchParams();
      
      const payloadMap: Record<string, string> = {
        fullName: fullName || "",
        cpf: cpf || "",
        email: email || "",
        phone: phone || "",
        organization: organization || "",
        cityState: cityState || "",
        visitorCount: String(visitorCount || 1),
        scheduledDate: scheduledDate || "",
        purpose: purpose || ""
      };

      for (const [fieldKey, formKey] of Object.entries(mappings)) {
        if (formKey && payloadMap[fieldKey] !== undefined) {
          if (fieldKey === "scheduledDate" && payloadMap[fieldKey]) {
            const dateVal = payloadMap[fieldKey]; // "YYYY-MM-DD"
            const dateParts = dateVal.split("-");
            if (dateParts.length === 3) {
              const [yr, mo, dy] = dateParts;
              formParams.append(`${formKey}_year`, yr);
              formParams.append(`${formKey}_month`, mo);
              formParams.append(`${formKey}_day`, dy);
            }
          }
          formParams.append(String(formKey), payloadMap[fieldKey]);
        }
      }

      const googleFormsUrl = config.googleFormsUrl;
      const urlClean = googleFormsUrl.split("?")[0];
      const submitUrl = urlClean.endsWith("/formResponse") 
        ? urlClean 
        : urlClean.replace(/\/viewform|\/edit|\/viewanalytics|\/closedform|$/, "/formResponse");

      console.log(`Wilson Sons – Enviando dados ao Google Forms: ${submitUrl}`);
      console.log(`Wilson Sons – Parâmetros enviados: ${formParams.toString()}`);
      
      const response = await fetch(submitUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formParams.toString(),
      });

      const responseOk = response.ok || response.status === 200 || response.status === 302;
      let detailedMessage = responseOk ? "Ficha operacional despachada com sucesso às instâncias do Google Forms!" : `Google Forms retornou código ${response.status}`;
      
      if (!responseOk) {
        try {
          const bodyText = await response.text();
          console.error("Wilson Sons – Resposta de erro do Google Forms (primeiros 500 chars):", bodyText.slice(0, 500));
          
          if (response.status === 400) {
            detailedMessage += " - ERRO DE VALIDAÇÃO (400): Alguma chave entry.xxxxx enviada não existe no formulário real, ou há campos obrigatórios vazios. Acesse o Painel Admin e verifique se as chaves salvas correspondem exatamente ao formulário no Google.";
          } else if (bodyText.includes("Sign in") || bodyText.includes("accounts.google.com") || bodyText.includes("service=wise")) {
            detailedMessage += " - REQUISITO DE LOGIN: O Google Forms exige login. Desative as opções 'Limitar a 1 resposta', 'Restringir aos usuários da minha organização' e 'Coletar e-mails = Verificado' nas configurações do Google Forms.";
          } else if (bodyText.includes("is required") || bodyText.includes("obrigatori") || bodyText.includes("pergunta obrigatória")) {
            detailedMessage += " - CAMPO OBRIGATÓRIO AUSENTE: Um campo essencial do formulário não foi enviado ou possui valor incompatível.";
          } else {
            const titleMatch = bodyText.match(/<title>([\s\S]*?)<\/title>/i);
            const errorTitle = titleMatch ? titleMatch[1].trim() : "";
            detailedMessage += ` / Detalhe técnico: "${errorTitle || "Erro na validação do formulário ou correspondência de campos."}"`;
          }
        } catch (e) {
          console.error("Erro ao ler corpo da resposta de erro do Google Forms:", e);
        }
      }

      if (responseOk) {
        // Save the request to the persistent server database registrations.json
        try {
          const current = readRegistrations();
          const isDuplicate = current.some((r: any) => r.cpf === cpf && r.scheduledDate === scheduledDate);
          if (!isDuplicate) {
            const nextIdNumber = current.length + 1;
            const formattedId = `WS-REQ-${String(nextIdNumber).padStart(3, "0")}`;
            const newRequest = {
              fullName: fullName || "",
              cpf: cpf || "",
              email: email || "",
              phone: phone || "",
              organization: organization || "",
              cityState: cityState || "",
              visitorCount: Number(visitorCount || 1),
              scheduledDate: scheduledDate || "",
              purpose: purpose || "",
              id: formattedId,
              status: "PENDING",
              submissionDate: new Date().toISOString().slice(0, 10),
              securityCleared: true,
              securityConsentDate: new Date().toISOString(),
              visitorPhoto: visitorPhoto || ""
            };
            const updated = [newRequest, ...current];
            writeRegistrations(updated);
            console.log(`Wilson Sons – Salvo registro de visita automaticamente no servidor: ${formattedId}`);

            // Send automatic/integrated confirmation email immediately after form submission
            sendNotificationEmail(newRequest, "PENDING")
              .then((resp) => console.log(`[Form-Submission] Sent confirmation email for ${formattedId} to ${newRequest.email}:`, resp.message))
              .catch((err) => console.error(`[Form-Submission] Failed to send confirmation email for ${formattedId}:`, err));
          }
        } catch (e) {
          console.error("Wilson Sons – Erro ao salvar registro inserido na submissão do google-form:", e);
        }
      }

      return res.json({ 
        success: responseOk, 
        message: detailedMessage
      });

    } catch (err: any) {
      console.error("Wilson Sons – Falha crítica de conexão ao Google Forms:", err);
      return res.status(500).json({ 
        success: false, 
        error: "Falha de conexão com a infraestrutura do Google Forms.",
        details: err.message 
      });
    }
  });

  // 1. API - Analyze Objectives using Gemini AI
  app.post("/api/analyze-objective", async (req, res) => {
    const { purpose, visitorCount, scheduledDate, fullName, organization } = req.body;

    if (!purpose) {
      return res.status(400).json({ error: "O objetivo da visita é obrigatório." });
    }

    // Check if API key is mock or real before constructing GoogleGenAI client to avoid crashes
    if (isApiKeyFake(apiKey)) {
      console.log("Simulating Gemini API response due to lack of a real key.");
      const formattedDate = scheduledDate && typeof scheduledDate === "string" ? scheduledDate.split("-").reverse().join("/") : "solicitada";
      const simulatedResp = `### 💡 Pontos de Interesse Wilson Sons Recomendados
Olá, **${fullName || "Prezado Cliente"}** representativo da **${organization || "sua empresa"}**! Como o intuito de sua visita é: *"${purpose}"*, recomendamos a incorporação das seguintes frentes de visita:
- **Centro de Aperfeiçoamento Marítimo (CAM)**: Excelente para analisar os fluxos no simulador de última geração "full-mission" e treinar contingências de manobra de rebocadores.
- **Centro de Controle Operacional (CCO)**: Ideal para acompanhar em tempo real as coordenadas e logística portuária da Wilson Sons.

### 🕒 Recomendação de Horário e Logística
- **Janela Operacional**: Sugerimos o agendamento no período da manhã (entre **09:00 e 11:30** da data **${formattedDate}**). Esse horário evita picos de movimentação de gate no terminal, garantindo recepção informativa com orientações didáticas minuciosas e maior segurança física na área portuária.

### 🛡️ Precauções Específicas de Segurança
- **Proteção Completa**: Além do kit padrão Wilson Sons (Capacete, Óculos com proteção UV, e Botina de segurança antiderrapante com biqueira integrada), recomendamos o uso obrigatório de colete de alta visibilidade Classe 2 tipo refletivo, calçados fechados sem salto e a participação prévia na nossa palestra obrigatória integrada de Integração Geral de Visitantes da Planta (EPI/Física). Não será permitido portar adornos, anéis ou celulares dentro do pátio operacional sob regime de movimentação de carga.`;
      
      return res.json({ suggestions: simulatedResp, simulated: true });
    }

    try {
      const ai = getAiClient();
      
      const systemInstruction = `Você é um Engenheiro de Logística e Supervisor de Segurança do Trabalho (SESMT) sênior da Wilson Sons.
Sua tarefa é analisar o "Objetivo de Visita" fornecido pelo visitante e gerar sugestões operacionais personalizadas e pontos de interesse ideais dentro das nossas instalações Wilson Sons para enriquecer a experiência e garantir segurança máxima.

As instalações e unidades de negócios Wilson Sons incluem:
- Tecon Rio Grande-RS ou Tecon Salvador-BA: Terminais de Containers líderes, operações de guindastes STS, RTGs e fluxo intenso de caminhões.
- Estaleiros Wilson Sons (Guarujá-SP): Construção, manutenção e conversão de embarcações operacionais importantes e rebocadores de alta tecnologia.
- Centro de Aperfeiçoamento Marítimo - CAM (Guarujá/Santos-SP): Simuladores de manobra de rebocador "full-mission" realista para formação de capitães.
- Frota de Rebocadores de Apoio Portuário: Inclui os inovadores e sustentáveis rebocadores híbridos de última geração.
- Centro de Controle Operacional (CCO) Wilson Sons: Sistema concentrado de monitoramento de tráfego de embarcações e segurança operacional em tempo real.

Gere uma resposta profissional, estruturada em Markdown de forma muito polida e direta, usando as seguintes seções estruturadas:
1. 💡 **Pontos de Interesse Wilson Sons recomendados**: Associe diretamente o objetivo do visitante com o ativo ou local perfeito da Wilson Sons (ex: sugerir os simuladores CAM se for visita educacional/engenharia, ou Tecon se for logística empresarial, ou Estaleiros se for construção/reparo naval).
2. 🕒 **Recomendação de Horário e Logística**: Sugira turnos ideais (ex: turnos da manhã das 09:00 - 11:30 para maior visibilidade e sessões informativas seguras, evitando picos de descarga de carretas, ou sugerir coordenar com as janelas de calado de maré).
3. 🛡️ **Precauções Específicas de Segurança**: Indique regulamentos específicos ao objetivo além dos EPIs genéricos (capacete, colete, óculos, botina de biqueira d'aço) — ex: se for visita operacional próxima a guias de berço, necessita colete salva-vidas autoflutuável autoinflável.

Importante: Identifique e saúde de forma cordial o visitante pelo nome se fornecido (${fullName || "Visitante"}) e empresa representada (${organization || "sua organização"}). Mantenha a resposta concisa, limpa e encorajadora.`;

      const promptText = `Nome do Visitante: ${fullName || "Não informado"}
Empresa/Instituição: ${organization || "Não informada"}
Quantidade de Pessoas: ${visitorCount || 1} participante(s)
Data Proposta: ${scheduledDate || "Não informada"}
Objetivo Declarado: "${purpose}"

Analise o objetivo acima e forneça as sugestões operacionais estruturadas conforme as instruções de trabalho da Wilson Sons.`;

      // Check if API key is mock or real
      if (isApiKeyFake(apiKey)) {
        // Return a highly premium and intelligent, simulated response reflecting mock intelligence,
        // so the system is fully functional even if the user lacks active billing in Cloud Run container development instant.
        console.log("Simulating Gemini API response due to lack of a real key.");
        const simulatedResp = `### 💡 Pontos de Interesse Wilson Sons Recomendados
Olá, **${fullName || "Prezado Cliente"}** representativo da **${organization || "sua empresa"}**! Como o intuito de sua visita é: *"${purpose}"*, recomendamos a incorporação das seguintes frentes de visita:
- **Centro de Aperfeiçoamento Marítimo (CAM)**: Excelente para analisar os fluxos no simulador de última geração "full-mission" e treinar contingências de manobra de rebocadores.
- **Centro de Controle Operacional (CCO)**: Ideal para acompanhar em tempo real as coordenadas e logística portuária da Wilson Sons.

### 🕒 Recomendação de Horário e Logística
- **Janela Operacional**: Sugerimos o agendamento no período da manhã (entre **09:00 e 11:30** da data **${scheduledDate ? scheduledDate.split("-").reverse().join("/") : "solicitada"}**). Esse horário evita picos de movimentação de gate no terminal, garantindo recepção informativa com orientações didáticas minuciosas e maior segurança física na área portuária.

### 🛡️ Precauções Específicas de Segurança
- **Proteção Completa**: Além do kit padrão Wilson Sons (Capacete, Óculos com proteção UV, e Botina de segurança antiderrapante com biqueira integrada), recomendamos o uso obrigatório de colete de alta visibilidade Classe 2 tipo refletivo, calçados fechados sem salto e a participação prévia na nossa palestra obrigatória integrada de Integração Geral de Visitantes da Planta (EPI/Física). Não será permitido portar adornos, anéis ou celulares dentro do pátio operacional sob regime de movimentação de carga.`;
        
        return res.json({ suggestions: simulatedResp, simulated: true });
      }

      // Real Gemini API Call
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: promptText,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.7,
        },
      });

      const text = response.text || "Não foi possível gerar análise automática no momento.";
      return res.json({ suggestions: text, simulated: false });

    } catch (err: any) {
      console.warn("[GEMINI FAILSAFE] Real Gemini API call failed or key is compromised:", err.message);
      
      // Provide an extremely reliable, premium simulation backup so the operations flow of the Wilson Sons application
      // continues seamlessly even on a locked/leaked key or transient API credential outages.
      const formattedDate = scheduledDate && typeof scheduledDate === "string" 
        ? scheduledDate.split("-").reverse().join("/") 
        : "solicitada";
      
      const simulatedResp = `### 💡 Pontos de Interesse Wilson Sons Recomendados (Gerado em Contingência)
Olá, **${fullName || "Prezado Cliente"}** representativo de **${organization || "sua empresa"}**! Como o intuito de sua visita é: *"${purpose}"*, recomendamos a incorporação das seguintes frentes de visita portuárias:
- **Centro de Aperfeiçoamento Marítimo (CAM)**: Excelente para analisar os fluxos no simulador de última geração "full-mission" e treinar contingências de manobra de rebocadores.
- **Centro de Controle Operacional (CCO)**: Ideal para acompanhar em tempo real as coordenadas e logística portuária da Wilson Sons.

### 🕒 Recomendação de Horário e Logística
- **Janela Operacional**: Sugerimos o agendamento no período da manhã (entre **09:00 e 11:30** da data **${formattedDate}**). Esse horário evita picos de movimentação de gate no terminal, garantindo recepção informativa com orientações didáticas e maior segurança física na área portuária.

### 🛡️ Precauções Específicas de Segurança
- **Proteção Completa**: Além do kit padrão Wilson Sons (Capacete, Óculos com proteção UV, e Botina de segurança antiderrapante com biqueira integrada), recomendamos o uso obrigatório de colete de alta visibilidade Classe 2 tipo refletivo, calçados fechados sem salto e a participação prévia na nossa palestra obrigatória integrada de Integração Geral de Visitantes da Planta (EPI/Física). Não será permitido portar adornos, anéis ou celulares dentro do pátio operacional sob regime de movimentação de carga.

*(Nota: O servidor de IA utilizou o modo de contingência devido a uma restrição temporária nas chaves operacionais: ${err.message})*`;

      return res.json({ 
        suggestions: simulatedResp, 
        simulated: true,
        apiError: err.message
      });
    }
  });

  const mailLogsPath = path.join(process.cwd(), "mail-logs.json");

  function readMailLogs() {
    try {
      if (fs.existsSync(mailLogsPath)) {
        const data = fs.readFileSync(mailLogsPath, "utf-8");
        return JSON.parse(data);
      }
    } catch (e) {
      console.error("Erro ao ler mail-logs.json:", e);
    }
    return [
      {
        id: "ML-001",
        to: "marcos.silveira@portoaustral.com",
        subject: "🏆 Credencial de Acesso Wilson Sons Liberada - Marcos Aurélio Silveira",
        date: "2026-06-05 11:20",
        type: "approval",
        body: "Olá Marcos Aurélio Silveira,\n\nSua credencial de acesso ao pátio operacional Wilson Sons foi devidamente autorizada pelo SESMT!\n\nAnexo a este e-mail, você recebeu o seu Crachá Virtual de Acesso. Ele acompanha o seu ID WS-REQ-000 e um QR Code correspondente.\n\nPor favor, imprima o crachá em tamanho real (85mm de largura por 135mm de altura) e utilize com um cordão de pescoço durante toda a segurança.",
        request: {
          id: "WS-REQ-000",
          fullName: "Marcos Aurélio Silveira",
          cpf: "111.555.999-88",
          email: "marcos.silveira@portoaustral.com",
          phone: "(27) 99341-2288",
          organization: "Porto Austral Logística",
          cityState: "Vitória - ES",
          visitorCount: 3,
          scheduledDate: "2026-05-15",
          purpose: "Visita de intercâmbio operacional para conhecer os rebocadores e os guindastes móveis STS.",
          status: "APPROVED",
          submissionDate: "2026-05-01",
          securityCleared: true,
          securityConsentDate: "2026-05-01T10:14:00Z"
        }
      }
    ];
  }

  function writeMailLogs(logs: any[]) {
    try {
      fs.writeFileSync(mailLogsPath, JSON.stringify(logs, null, 2), "utf-8");
    } catch (e) {
      console.error("Erro ao salvar mail-logs.json:", e);
    }
  }

  async function sendNotificationEmail(request: any, status: string, rejectionReason?: string) {
    const config = readConfig();
    const host = config.smtpHost || process.env.SMTP_HOST || "";
    const port = parseInt(config.smtpPort || process.env.SMTP_PORT || "587");
    const user = (config.smtpUser || process.env.SMTP_USER || "").trim();
    let pass = config.smtpPass || process.env.SMTP_PASS || "";

    if (pass) {
      const trimmedPass = pass.trim();
      const strippedPass = trimmedPass.replace(/\s+/g, "");
      if (
        (strippedPass.length === 16 && /^[a-zA-Z]+$/.test(strippedPass)) ||
        host.includes("gmail") || 
        host.includes("google")
      ) {
        pass = strippedPass;
      } else {
        pass = trimmedPass;
      }
    }

    const fromAddr = process.env.SMTP_FROM || config.smtpFrom || user || "sesmt@wilsonsons.com.br";
    const isSmtpConfigured = host !== "" && user !== "" && pass !== "";

    // Determine target notification type with multi-layered fallback checks for maximum safety
    const statusLower = typeof status === "string" ? status.trim().toLowerCase() : "";
    const reqStatusLower = (request && typeof request.status === "string") ? request.status.trim().toLowerCase() : "";

    console.log(`[sendNotificationEmail] Matching status. Parameter status: "${status}" (lower: "${statusLower}"), Request object status: "${request ? request.status : "undefined"}" (lower: "${reqStatusLower}")`);

    // Prioritize explicit status parameter, fallback to request status representation if missing/empty
    let isApproved = false;
    let isRejected = false;

    if (statusLower === "approved" || statusLower === "aprovado" || statusLower.startsWith("aprov")) {
      isApproved = true;
    } else if (statusLower === "rejected" || statusLower === "rejeitado" || statusLower.startsWith("rejeit") || statusLower.startsWith("recus")) {
      isRejected = true;
    } else if (statusLower === "pending" || statusLower === "pendente" || statusLower.startsWith("pend")) {
      // Explicitly registering or setting back to Pending - sends registration confirmation
    } else {
      // Fallback check based on request object status properties
      if (reqStatusLower === "approved" || reqStatusLower === "aprovado" || reqStatusLower.startsWith("aprov")) {
        isApproved = true;
      } else if (reqStatusLower === "rejected" || reqStatusLower === "rejeitado" || reqStatusLower.startsWith("rejeit") || reqStatusLower.startsWith("recus")) {
        isRejected = true;
      }
    }

    const isPending = !isApproved && !isRejected;

    console.log(`[sendNotificationEmail] Resolved type: isApproved = ${isApproved}, isRejected = ${isRejected}, isPending = ${isPending}`);

    const dateStr = request.scheduledDate ? request.scheduledDate.split("-").reverse().join("/") : "";
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(request.id)}&color=003366`;

    // Process photo CID attachment
    const attachments: any[] = [];
    let photoSrc = "";
    if (request.visitorPhoto) {
      if (typeof request.visitorPhoto === "string" && request.visitorPhoto.startsWith("data:")) {
        console.log("[sendNotificationEmail] Parsing base64 visitorPhoto data-url...");
        const parts = request.visitorPhoto.split(";base64,");
        if (parts.length === 2) {
          const contentType = parts[0].replace("data:", "").trim();
          // Remove any whitespaces/newlines from base64 content to prevent SMTP line corruption or parsing bugs
          const base64Content = parts[1].replace(/\s/g, "");
          const ext = contentType.split("/")[1] || "jpg";
          attachments.push({
            filename: `foto_credenciado.${ext}`,
            content: Buffer.from(base64Content, "base64"),
            cid: "visitorPhoto"
          });
          photoSrc = "cid:visitorPhoto";
          console.log(`[sendNotificationEmail] Successfully attached photo inline with CID representation. Extension: ${ext}`);
        } else {
          console.warn("[sendNotificationEmail] Base64 visitorPhoto format is non-standard. Stripping to empty.");
          photoSrc = "";
        }
      } else {
        photoSrc = request.visitorPhoto;
      }
    }

    let htmlBody = "";
    let subject = "";
    let type: "approval" | "rejection" | "confirmation" = "rejection";

    if (isApproved) {
      type = "approval";
      subject = `🏆 Credencial de Acesso Wilson Sons Liberada - ${request.fullName}`;
      htmlBody = `
      <div style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 30px 15px; color: #1e293b; text-align: left;">
        <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
          <div style="background-color: #003366; padding: 25px 20px; text-align: center; border-bottom: 4px solid #F58220;">
            <h1 style="color: #ffffff; font-size: 20px; font-weight: 800; margin: 0; text-transform: uppercase; letter-spacing: 0.5px;">Wilson Sons</h1>
            <p style="color: #e2e8f0; font-size: 11px; font-weight: 700; margin: 5px 0 0 0; text-transform: uppercase; letter-spacing: 1.5px;">Credencial de Acesso Homologada - SESMT</p>
          </div>
          <div style="padding: 25px 30px;">
            <p style="font-size: 15px; line-height: 1.6; color: #334155; margin-top: 0;">
              Olá, <strong>${request.fullName}</strong>,
            </p>
            <p style="font-size: 14px; line-height: 1.6; color: #334155;">
              Temos a satisfação de informar que a sua credencial para visita operacional em nome da empresa <strong>${request.organization}</strong> foi analisada e <strong>APROVADA</strong> pelo nosso SESMT (Serviço Especializado em Engenharia de Segurança e em Medicina do Trabalho)!
            </p>
            
            <div style="margin: 30px auto; max-width: 380px; background-color: #f8fafc; border: 2px solid #003366; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);">
              <div style="background-color: #003366; padding: 15px; text-align: center; border-bottom: 3px solid #F58220;">
                <div style="color: #ffffff; font-size: 15px; font-weight: 800; letter-spacing: 0.5px;">WILSON SONS</div>
                <div style="color: #F58220; font-size: 8px; font-weight: 800; letter-spacing: 2px;">CREDENCIAL DE ACESSO</div>
              </div>
              <div style="padding: 20px 15px; background: #ffffff;">
                <div style="display: table; width: 100%;">
                  <div style="display: table-row;">
                    <div style="display: table-cell; width: 45%; vertical-align: top; text-align: center;">
                      ${photoSrc ? `
                        <div style="width: 115px; height: 145px; border: 2px solid #cbd5e1; border-radius: 8px; overflow: hidden; background-color: #f1f5f9; display: inline-block;">
                          <img src="${photoSrc}" alt="Foto" style="width: 100%; height: 100%; object-fit: cover;" />
                        </div>
                      ` : `
                        <div style="width: 115px; height: 145px; border: 2px dashed #94a3b8; border-radius: 8px; background-color: #f8fafc; display: table; text-align: center;">
                          <div style="display: table-cell; vertical-align: middle; color: #94a3b8; font-size: 10px; font-weight: bold; padding: 5px;">
                            TRAGA FOTO 3X4 OU DOCUMENTO
                          </div>
                        </div>
                      `}
                      <div style="margin-top: 8px; font-size: 10px; color: #64748b; font-weight: bold;">FOTO PORTAL</div>
                    </div>
                    <div style="display: table-cell; width: 55%; vertical-align: top; padding-left: 15px; text-align: center;">
                      <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 6px; display: inline-block;">
                        <img src="${qrCodeUrl}" alt="QR Code" style="width: 115px; height: 115px; display: block;" />
                      </div>
                      <div style="margin-top: 5px; font-family: monospace; font-size: 11px; font-weight: bold; color: #0f172a; text-transform: uppercase;">
                        ID: ${request.id}
                      </div>
                    </div>
                  </div>
                </div>
                <div style="border-top: 1px solid #f1f5f9; margin-top: 15px; padding-top: 12px;">
                  <table style="width: 100%; font-size: 11px; border-collapse: collapse;">
                    <tr>
                      <td style="color: #64748b; padding-bottom: 4px; font-weight: bold;">NOME:</td>
                      <td style="color: #0d172a; font-weight: 800; padding-bottom: 4px; text-transform: uppercase;">${request.fullName}</td>
                    </tr>
                    <tr>
                      <td style="color: #64748b; padding-bottom: 4px; font-weight: bold;">DOCUMENTO:</td>
                      <td style="color: #0d172a; font-weight: bold; padding-bottom: 4px; font-family: monospace;">${request.cpf}</td>
                    </tr>
                    <tr>
                      <td style="color: #64748b; padding-bottom: 4px; font-weight: bold;">ENTIDADE:</td>
                      <td style="color: #0d172a; font-weight: bold; padding-bottom: 4px; text-transform: uppercase;">${request.organization}</td>
                    </tr>
                    <tr>
                      <td style="color: #64748b; font-weight: bold;">DATA AGENDADA:</td>
                      <td style="color: #ea580c; font-weight: 800;">${dateStr}</td>
                    </tr>
                  </table>
                </div>
              </div>
              <div style="background-color: #F58220; padding: 8px 10px; text-align: center; font-size: 9px; color: #ffffff; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">
                USO OBRIGATÓRIO DE EPI NO PÁTIO OPERACIONAL
              </div>
            </div>

            <div style="background-color: #f1f5f9; border-left: 4px solid #ea580c; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h4 style="margin: 0 0 8px 0; font-size: 12px; color: #ea580c; text-transform: uppercase; letter-spacing: 0.5px;">Instruções ao Portador (Diretrizes do SESMT)</h4>
              <ul style="margin: 0; padding-left: 20px; font-size: 12px; color: #475569; line-height: 1.6;">
                <li><strong>Impressão Obrigatória:</strong> Imprima esta credencial em tamanho real (85mm x 135mm) e utilize com um cordão de pescoço durante toda a segurança.</li>
                <li><strong>EPIs Básicos Obrigatórios:</strong> Calçado fechado de segurança (botina), capacete com jugular, óculos de proteção e colete refletivo durante toda a permanência no terminal operacional.</li>
                <li><strong>Documento de Identidade:</strong> Apresente esta credencial acompanhada de documento original com foto na portaria de segurança.</li>
              </ul>
            </div>
            <p style="font-size: 14px; line-height: 1.6; color: #334155;">
              Desejamos-lhe uma excelente e produtiva visita técnica portuária!
            </p>
          </div>
          <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #f1f5f9; font-size: 11px; color: #94a3b8;">
            Este e-mail é gerado de forma automática e integrada pelo portal da Wilson Sons.<br />
            Favor não responder diretamente a este endereço.
          </div>
        </div>
      </div>`;
    } else if (isRejected) {
      type = "rejection";
      subject = `❌ Visita Operacional Wilson Sons Não Autorizada - ${request.fullName}`;
      htmlBody = `
      <div style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 30px 15px; color: #1e293b; text-align: left;">
        <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
          <div style="background-color: #ef4444; padding: 25px 20px; text-align: center; border-bottom: 4px solid #b91c1c;">
            <h1 style="color: #ffffff; font-size: 18px; font-weight: 800; margin: 0; text-transform: uppercase;">Wilson Sons</h1>
            <p style="color: #fee2e2; font-size: 11px; font-weight: 700; margin: 5px 0 0 0; text-transform: uppercase; letter-spacing: 1.5px;">Análise Técnica de Segurança - SESMT</p>
          </div>
          <div style="padding: 25px 30px;">
            <p style="font-size: 15px; line-height: 1.6; color: #334155; margin-top: 0;">
              Prezado(a) <strong>${request.fullName}</strong>,
            </p>
            <p style="font-size: 14px; line-height: 1.6; color: #334155;">
              Lamentamos informar que a sua solicitação de acesso para a empresa <strong>${request.organization}</strong> não pôde ser autorizada pela equipe técnica de Segurança do Trabalho e Engenharia Geral neste momento.
            </p>
            
            <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h4 style="margin: 0 0 8px 0; font-size: 12px; color: #b91c1c; text-transform: uppercase; letter-spacing: 0.5px;">Motivo Indicado para não Homologação</h4>
              <p style="margin: 0; font-size: 13px; color: #7f1d1d; line-height: 1.6; font-style: italic;">
                "${rejectionReason || "Não atende aos critérios regulamentares mínimos exigidos de segurança operacional, ou dados insuficientes da ficha de agendamento."}"
              </p>
            </div>
            <p style="font-size: 14px; line-height: 1.6; color: #334155;">
              Caso deseje adequar os requisitos, você poderá submeter uma nova solicitação contendo as devidas adequações através do nosso Portal Integrado de Agendamento.
            </p>
          </div>
          <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #f1f5f9; font-size: 11px; color: #94a3b8;">
            Este e-mail é gerado de forma automática e integrada pelo portal de Segurança da Wilson Sons.<br />
            Favor não responder diretamente a este endereço.
          </div>
        </div>
      </div>`;
    } else {
      type = "confirmation";
      subject = `📝 Confirmação de Solicitação de Visita - Wilson Sons`;
      htmlBody = `
      <div style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 30px 15px; color: #1e293b; text-align: left;">
        <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
          <div style="background-color: #003366; padding: 25px 20px; text-align: center; border-bottom: 4px solid #F58220;">
            <h1 style="color: #ffffff; font-size: 20px; font-weight: 800; margin: 0; text-transform: uppercase; letter-spacing: 0.5px;">Wilson Sons</h1>
            <p style="color: #ffffff; font-size: 11px; font-weight: 700; margin: 5px 0 0 0; text-transform: uppercase; letter-spacing: 1.5px;">Segurança Portuária & SESMT</p>
          </div>
          
          <div style="padding: 25px 30px;">
            <p style="font-size: 15px; line-height: 1.6; color: #334155; margin-top: 0;">
              Olá, <strong>${request.fullName}</strong>,
            </p>
            <p style="font-size: 14px; line-height: 1.6; color: #334155;">
              Recebemos com sucesso a sua solicitação de agendamento de visita operacional para a empresa <strong>${request.organization}</strong> com ID de protocolo <strong>${request.id}</strong>.
            </p>
            
            <div style="background-color: #f1f5f9; border-left: 4px solid #F58220; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h4 style="margin: 0 0 8px 0; font-size: 12px; color: #ea580c; text-transform: uppercase; letter-spacing: 0.5px;">Regulamento Geral & EPIs Obrigatórios</h4>
              <p style="margin: 0; font-size: 13px; color: #475569; line-height: 1.6;">
                Sua ficha de visita foi indexada no nosso banco de dados. O acesso à área operacional exige o cumprimento estrito das normas de segurança:
              </p>
              <ul style="margin: 10px 0 0 0; padding-left: 20px; font-size: 12px; color: #475569; line-height: 1.6;">
                <li><strong>Capacete com Jugular:</strong> Fornecido ou trazido para proteção contra quedas de objetos ou batidas físicas.</li>
                <li><strong>Óculos de Segurança:</strong> Proteção ocular inteira nas áreas portuárias.</li>
                <li><strong>Colete Refletivo Classe 2:</strong> De alta visibilidade para sinalização ativa de dia ou de noite.</li>
                <li><strong>Botina de Segurança:</strong> Com biqueira de proteção e sola antiderrapante.</li>
              </ul>
            </div>

            <p style="font-size: 14px; line-height: 1.5; color: #334155;">
              <strong>Próximos passos:</strong> O SESMT analisará o seu pedido técnico para validar os objetivos legais e a conformidade com as regras de aduana e logística do terminal.
            </p>
            <p style="font-size: 14px; line-height: 1.5; color: #334155;">
              Você receberá uma nova notificação por e-mail contendo sua credencial com QR Code (caso aprovada) ou informando as razões regulatórias (caso recusada).
            </p>

            <p style="font-size: 13px; line-height: 1.6; color: #475569; border-top: 1px dashed #cbd5e1; padding-top: 15px; text-align: center;">
              Protocolo: <strong>${request.id}</strong> | Data Solicitada: <strong>${dateStr}</strong>
            </p>
          </div>
          
          <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #f1f5f9; font-size: 11px; color: #94a3b8;">
            Este e-mail é gerado de forma automática e integrada pelo portal da Wilson Sons.<br />
            Favor não responder diretamente a este endereço.
          </div>
        </div>
      </div>`;
    }

    // Build mail log schema
    const mailLog = {
      id: `ML-${String(Date.now()).slice(-6)}`,
      to: request.email,
      subject: subject,
      date: new Date().toISOString().slice(0, 16).replace("T", " "),
      type: type,
      body: isApproved 
        ? `Prezado(a) ${request.fullName},\n\nSua credencial de visita portuária Wilson Sons foi APROVADA com sucesso!\n\nSua credencial (85mm x 135mm) de acesso com QR Code oficial e foto foi gerada no sistema.\n\nID do Crachá: ${request.id}\nData Agendada: ${dateStr}\nEmail de destino: ${request.email}`
        : isRejected
          ? `Prezado(a) ${request.fullName},\n\nSua visita portuária não atende aos requisitos de segurança do trabalho no momento.\n\nMotivo da recusa:\n"${rejectionReason || "Não conformidade técnica no preenchimento."}"`
          : `Prezado(a) ${request.fullName},\n\nSua solicitação de agendamento de visita operacional Wilson Sons foi recebida com sucesso e está em análise pelo SESMT.\n\nProtocolo: ${request.id}\nData solicitada: ${dateStr}\n\nLembre-se que o uso de EPIs é OBRIGATÓRIO nas dependências operacionais.`,
      htmlBody: htmlBody,
      request: request
    };

    // Save logs to filesystem
    try {
      const logs = readMailLogs();
      writeMailLogs([mailLog, ...logs]);
    } catch (e) {
      console.error("Erro ao gravar logs de email no servidor:", e);
    }

    if (!isSmtpConfigured) {
      console.log(`[SMTP SIMULATION] Real SMTP not configured in database. Simulating email transmission of ${type} to ${request.email}`);
      return {
        success: true,
        smtpConfigured: false,
        message: type === "confirmation"
          ? "E-mail de confirmação de cadastro gerado de forma integrada! Como as variáveis SMTP no ambiente (.env) não estão ativas no momento, o e-mail real não foi transmitido, mas foi arquivado e já pode ser visualizado na aba 'E-mails Enviados' no Painel Admin."
          : type === "approval"
            ? "E-mail de credencial gerado de forma integrada! Como as variáveis SMTP no ambiente (.env) não estão ativas no momento, o e-mail real não foi transmitido, mas foi arquivado e já pode ser visualizado na aba 'E-mails Enviados' no Painel Admin."
            : "E-mail de recusa de cadastro gerado de forma integrada! Como as variáveis SMTP no ambiente (.env) não estão ativas no momento, o e-mail real não foi transmitido, mas foi arquivado e já pode ser visualizado na aba 'E-mails Enviados' no Painel Admin.",
        mailLog
      };
    }

    try {
      console.log(`[SMTP TRANSMISSION] Sending real email via SMTP host ${host}:${port} to ${request.email}`);
      
      let transportOpts: any = {
        host: host,
        port: port,
        secure: port === 465,
        auth: {
          user: user,
          pass: pass,
        },
        tls: {
          rejectUnauthorized: false
        },
        connectionTimeout: 20000, 
        greetingTimeout: 20000,   
        socketTimeout: 45000      
      };

      if (host.includes("gmail") || host.includes("google")) {
        transportOpts = {
          service: "gmail",
          auth: {
            user: user,
            pass: pass,
          },
          tls: {
            rejectUnauthorized: false
          },
          connectionTimeout: 20000,
          greetingTimeout: 20000,
          socketTimeout: 45000
        };
      }

      const transporter = nodemailer.createTransport(transportOpts);

      const info = await transporter.sendMail({
        from: `"${fromAddr.includes("@") ? "Wilson Sons SESMT" : fromAddr}" <${fromAddr}>`,
        to: request.email,
        subject: subject,
        html: htmlBody,
        attachments: attachments,
        text: mailLog.body
      });

      console.log(`[SMTP TRANSMISSION] Email successfully sent in real flight! Message ID: ${info.messageId}`);
      
      return {
        success: true,
        smtpConfigured: true,
        message: type === "confirmation"
          ? `E-mail de confirmação enviado com sucesso para ${request.email}! ID da mensagem: ${info.messageId}`
          : type === "approval"
            ? `Credencial enviada de forma autêntica com sucesso para o e-mail real: ${request.email}! ID da mensagem: ${info.messageId}`
            : `Ficha de recusa enviada por e-mail com sucesso para: ${request.email}! ID da mensagem: ${info.messageId}`,
        mailLog
      };
    } catch (err: any) {
      console.warn("[SMTP FAILSAFE] Real SMTP failed or timed out: ", err.message);
      
      let customError = err.message;
      if (
        err.message.includes("535") || 
        err.message.toLowerCase().includes("badcredentials") || 
        err.message.toLowerCase().includes("invalid login") || 
        err.message.toLowerCase().includes("username and password not accepted")
      ) {
        customError = "Credenciais Inválidas (Erro SMTP 535). O Google exige o uso de uma 'Senha de App' de 16 caracteres em contas Gmail com Verificação de Duas Etapas ativada, em vez de sua senha comum de login. Por favor, crie uma 'Senha de App' nas configurações de segurança da sua Conta Google e salve-a no Painel Admin!";
      } else if (err.code === "ETIMEDOUT" || err.code === "ECONNREFUSED" || err.message.toLowerCase().includes("timeout")) {
        customError = `Conectividade recusada ou limite de tempo esgotado (${err.code || "TIMEOUT"}). O servidor SMTP (${host}:${port}) está temporariamente inacessível.`;
      }

      return {
        success: true,
        smtpConfigured: true,
        smtpError: err.message,
        message: type === "confirmation"
          ? `Solicitação recebida com sucesso! O e-mail de confirmação está disponível na aba 'E-mails Enviados' do Painel Admin (Envio real falhou: ${customError}).`
          : type === "approval"
            ? `Credencial gerada com sucesso! O crachá de acesso está disponível na aba 'E-mails Enviados' do Painel Admin (Envio real falhou: ${customError}).`
            : `Visita recusada com sucesso! O e-mail de aviso está disponível na aba 'E-mails Enviados' do Painel Admin (Envio real falhou: ${customError}).`,
        mailLog
      };
    }
  }

  // API - Mail Logs
  app.get("/api/mail-logs", (req, res) => {
    return res.json(readMailLogs());
  });

  // API - Send Status Email with real nodemailer integration!
  app.post("/api/send-status-email", async (req, res) => {
    const { request, status, rejectionReason } = req.body;

    if (!request || !status) {
      return res.status(400).json({ success: false, error: "Dados incompletos para envio de e-mail." });
    }

    try {
      const responsePayload = await sendNotificationEmail(request, status, rejectionReason);
      return res.json(responsePayload);
    } catch (err: any) {
      console.error("[send-status-email Endpoint Error]", err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  /*
    const config = readConfig();
    const host = config.smtpHost || process.env.SMTP_HOST || "";
    const port = parseInt(config.smtpPort || process.env.SMTP_PORT || "587");
    const user = (config.smtpUser || process.env.SMTP_USER || "").trim();
    let pass = config.smtpPass || process.env.SMTP_PASS || "";
    
    // Automatically sanitize the SMTP password to handle Google App Password formatting spaces (e.g., "wgjo zurr psfr gtxx"):
    if (pass) {
      const trimmedPass = pass.trim();
      const strippedPass = trimmedPass.replace(/\s+/g, "");
      
      // If it's a 16-character App Password (often spaced out to 19 chars) or we are connecting to a Gmail/Google server,
      // we strip all spaces so that authentication succeeds.
      if (
        (strippedPass.length === 16 && /^[a-zA-Z]+$/.test(strippedPass)) ||
        host.includes("gmail") || 
        host.includes("google")
      ) {
        pass = strippedPass;
      } else {
        pass = trimmedPass;
      }
    }

    const fromAddr = process.env.SMTP_FROM || config.smtpFrom || user || "sesmt@wilsonsons.com.br";

    const isSmtpConfigured = host !== "" && user !== "" && pass !== "";

    // Build the beautiful Wilson Sons styled HTML email body
    const isApproved = 
      status === "APPROVED" || 
      status === "approved" || 
      status === "Aprovado" || 
      status === "aprovado" ||
      (typeof status === "string" && status.toLowerCase().startsWith("aprov"));
    const dateStr = request.scheduledDate ? request.scheduledDate.split("-").reverse().join("/") : "";
    
    // QR Code URL
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(request.id)}&color=003366`;

    // Parse the base64-encoded user photo into a CID inline attachment to bypass Gmail/Outlook image-blocking restrictions
    const attachments: any[] = [];
    let photoSrc = "";
    if (request.visitorPhoto) {
      if (typeof request.visitorPhoto === "string" && request.visitorPhoto.startsWith("data:")) {
        const matches = request.visitorPhoto.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          const contentType = matches[1];
          const base64Content = matches[2];
          const ext = contentType.split("/")[1] || "jpg";
          attachments.push({
            filename: `foto_credenciado.${ext}`,
            content: Buffer.from(base64Content, "base64"),
            cid: "visitorPhoto"
          });
          photoSrc = "cid:visitorPhoto";
        } else {
          photoSrc = request.visitorPhoto;
        }
      } else {
        photoSrc = request.visitorPhoto;
      }
    }

    let htmlBody = "";
    let subject = "";

    if (isApproved) {
      subject = `🏆 Credencial de Acesso Wilson Sons Liberada - ${request.fullName}`;
      htmlBody = `
      <div style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 30px 15px; color: #1e293b; text-align: left;">
        <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
          <!-- Top Accent Block resembling the brand -->
          <div style="background-color: #003366; padding: 25px 20px; text-align: center; border-bottom: 4px solid #F58220;">
            <h1 style="color: #ffffff; font-size: 20px; font-weight: 800; margin: 0; text-transform: uppercase; letter-spacing: 0.5px;">Wilson Sons</h1>
            <p style="color: #fff; font-size: 11px; font-weight: 700; margin: 5px 0 0 0; text-transform: uppercase; letter-spacing: 1.5px;">Segurança Portuária & SESMT</p>
          </div>
          
          <div style="padding: 25px 30px;">
            <p style="font-size: 15px; line-height: 1.6; color: #334155; margin-top: 0;">
              Olá, <strong>${request.fullName}</strong>,
            </p>
            <p style="font-size: 14px; line-height: 1.6; color: #334155;">
              Sua solicitação de agendamento de visita operacional para <strong>${request.organization}</strong> foi devidamente <strong>APROVADA</strong> pela equipe técnica de Segurança do Trabalho (SESMT) da Wilson Sons.
            </p>
            
            <div style="background-color: #f1f5f9; border-left: 4px solid #003366; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h4 style="margin: 0 0 8px 0; font-size: 12px; color: #003366; text-transform: uppercase; letter-spacing: 0.5px;">Instruções de Acesso Importantes</h4>
              <ul style="margin: 0; padding-left: 20px; font-size: 12px; color: #475569; line-height: 1.6;">
                <li><strong>Data da Visita:</strong> ${dateStr}</li>
                <li><strong>Uso do Crachá:</strong> Seu crachá com o QR Code de guarita oficial está anexado e impresso abaixo. Imprima em tamanho real (85mm x 135mm) e utilize com um cordão de pescoço.</li>
                <li><strong>EPIs Obrigatórios:</strong> Capacete, colete refletivo, óculos protetor e calçados fechados profissionais (botina com biqueira).</li>
              </ul>
            </div>

            <!-- Representation of the physical badge (CRASHCARD) in the email -->
            <div style="text-align: center; margin: 35px 0;">
              <p style="font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px;">
                --- VERSÃO DO CRACHÁ EM TAMANHO REAL PARA IMPRESSÃO ---
              </p>
              
              <!-- Badge Container mimicking the client VirtualBadge component exactly -->
              <div style="display: inline-block; width: 320px; height: 510px; background-color: #ffffff; border: 2px solid #cbd5e1; border-radius: 16px; overflow: hidden; text-align: left; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); font-family: Arial, sans-serif;">
                
                <!-- Lanyard strap area -->
                <div style="background-color: #f1f5f9; padding: 12px 10px; text-align: center; border-bottom: 1px solid #e2e8f0;">
                  <div style="width: 44px; height: 12px; border-radius: 6px; background-color: #1e293b; display: inline-block; border: 1px solid #0f172a; box-shadow: inset 0 2px 4px rgba(0,0,0,0.3);"></div>
                  <div style="font-size: 8px; font-family: monospace; color: #94a3b8; font-weight: bold; margin-top: 3px; letter-spacing: 1px;">ENCAIXE DO CORDÃO / LANYARD HOLE</div>
                </div>

                <!-- header -->
                <div style="background-color: #003366; padding: 12px 16px; color: #ffffff;">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td style="color: #ffffff; font-weight: bold; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">
                        WILSON SONS
                        <span style="display: block; font-size: 8px; color: #f97316; font-weight: bold; margin-top: 2px; letter-spacing: 0.8px;">OPERAÇÕES PORTUÁRIAS</span>
                      </td>
                      <td align="right" style="vertical-align: middle;">
                        <span style="background-color: rgba(16, 185, 129, 0.2); color: #34d399; font-size: 8px; font-family: monospace; font-weight: bold; padding: 2px 6px; border: 1px solid rgba(16, 185, 129, 0.4); border-radius: 4px; text-transform: uppercase;">Aprovado SESMT</span>
                      </td>
                    </tr>
                  </table>
                </div>

                <!-- orange strip -->
                <div style="height: 4px; background-color: #F58220;"></div>

                <!-- Body -->
                <div style="padding: 15px; height: calc(100% - 100px); box-sizing: border-box; background-color: #ffffff;">
                  
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-bottom: 1px dashed #e2e8f0; padding-bottom: 12px; margin-bottom: 10px;">
                    <tr>
                      <td width="95" style="vertical-align: top;">
                        <!-- Photo Frame -->
                        <div style="width: 85px; height: 105px; border: 2px solid #003366; border-radius: 6px; overflow: hidden; background-color: #f8fafc; text-align: center; position: relative;">
                          ${
                            photoSrc 
                              ? `<img src="${photoSrc}" style="width: 85px; height: 105px; object-fit: cover;" alt="" />`
                              : `<div style="padding-top: 30px; color: #cbd5e1; font-size: 8px; font-weight: bold; text-transform: uppercase;">SEM FOTO<br>NO PHOTO</div>`
                          }
                          <div style="position: absolute; bottom: 0; left: 0; right: 0; background-color: #059669; color: #ffffff; font-size: 8px; font-family: monospace; font-weight: bold; text-align: center; padding: 2px 0;">✓ SESMT</div>
                        </div>
                      </td>
                      <td style="vertical-align: top; padding-left: 12px; font-family: Arial, sans-serif;">
                        <span style="font-size: 8px; color: #ea580c; font-weight: bold; letter-spacing: 1px; display: block; margin-bottom: 2px;">VISITANTE AUTORIZADO</span>
                        <h3 style="margin: 0; color: #003366; font-size: 14px; font-weight: 800; text-transform: uppercase; line-height: 1.2;">${request.fullName}</h3>
                        <p style="margin: 3px 0 0 0; color: #475569; font-size: 11px; font-weight: bold; text-transform: uppercase;">${request.organization}</p>
                        
                        <div style="margin-top: 10px; font-size: 9px; font-family: monospace; color: #64748b; line-height: 1.4;">
                          CPF: <strong style="color: #334155;">${request.cpf}</strong><br />
                          SOLICITAÇÃO ID:<br /><strong style="color: #003366;">${request.id}</strong>
                        </div>
                      </td>
                    </tr>
                  </table>

                  <!-- QR code section of badge -->
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px;">
                    <tr>
                      <td width="80" style="vertical-align: middle; text-align: center;">
                        <img src="${qrCodeUrl}" style="width: 76px; height: 76px; border: 1px solid #cbd5e1; border-radius: 4px; background-color: #ffffff;" alt="QR" />
                      </td>
                      <td style="vertical-align: middle; padding-left: 8px; font-family: Arial, sans-serif;">
                        <div style="font-size: 9px; font-weight: bold; color: #003366; text-transform: uppercase; margin-bottom: 2px;">Leitor de Portaria</div>
                        <p style="margin: 0; font-size: 7.5px; color: #64748b; line-height: 1.3;">Apresente este código nas catracas físicas e guarita portuária para liberação imediata de acesso.</p>
                        <span style="display: inline-block; background-color: #ffedd5; color: #c2410c; font-size: 8px; font-family: monospace; font-weight: bold; padding: 2px 6px; border-radius: 4px; margin-top: 5px; border: 1px solid #fed7aa;">VALIDADE: ${dateStr}</span>
                      </td>
                    </tr>
                  </table>

                  <!-- Rule banner in card -->
                  <div style="background-color: #0f172a; border-radius: 6px; padding: 6px; margin-top: 10px;">
                    <div style="font-size: 8px; font-family: monospace; font-weight: bold; color: #f97316; margin-bottom: 3px; text-transform: uppercase;">🛡️ USO DE EPIS OBRIGATÓRIOS</div>
                    <div style="font-size: 7px; color: #94a3b8; font-weight: bold; text-transform: uppercase; line-height: 1.3;">
                      • CAPACETE COM JUGULAR &nbsp;&nbsp; • COLETE REFLETIVO CLASSE 2<br />
                      • BOTINA DE SEGURANÇA &nbsp;&nbsp; • PALESTRA DE INTEGRAÇÃO REALIZADA
                    </div>
                  </div>

                </div>

                <!-- Footer of Badge -->
                <div style="background-color: #f1f5f9; padding: 6px 12px; font-size: 7.5px; font-family: monospace; color: #94a3b8; text-transform: uppercase;">
                  <table width="100%">
                    <tr>
                      <td>PORTAL INTEGRADO DE SEGURANÇA</td>
                      <td align="right" style="color: #003366; font-weight: bold;">WILSON SONS CO.</td>
                    </tr>
                  </table>
                </div>

              </div>
              
            </div>

            <p style="font-size: 13px; line-height: 1.6; color: #475569; border-top: 1px dashed #cbd5e1; padding-top: 15px; text-align: center;">
              Caso precise de ajuda ou queira consultar o status em tempo real, visite nosso portal principal.
            </p>
          </div>
          
          <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #f1f5f9; font-size: 11px; color: #94a3b8;">
            Este e-mail é gerado de forma automática e integrada pelo portal da Wilson Sons.<br />
            Favor não responder diretamente a este endereço.
          </div>
        </div>
      </div>`;
    } else {
      subject = `❌ Visita Operacional Wilson Sons Não Autorizada - ${request.fullName}`;
      htmlBody = `
      <div style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 30px 15px; color: #1e293b; text-align: left;">
        <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
          <!-- Top Accent Block -->
          <div style="background-color: #ef4444; padding: 25px 20px; text-align: center; border-bottom: 4px solid #b91c1c;">
            <h1 style="color: #ffffff; font-size: 18px; font-weight: 800; margin: 0; text-transform: uppercase;">Wilson Sons</h1>
            <p style="color: #fee2e2; font-size: 11px; font-weight: 700; margin: 5px 0 0 0; text-transform: uppercase; letter-spacing: 1.5px;">Análise Técnica de Segurança - SESMT</p>
          </div>
          
          <div style="padding: 25px 30px;">
            <p style="font-size: 15px; line-height: 1.6; color: #334155; margin-top: 0;">
              Prezado(a) <strong>${request.fullName}</strong>,
            </p>
            <p style="font-size: 14px; line-height: 1.6; color: #334155;">
              Lamentamos informar que a sua solicitação de acesso para a empresa <strong>${request.organization}</strong> não pôde ser autorizada pela equipe técnica de Segurança do Trabalho e Engenharia Geral neste momento.
            </p>
            
            <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h4 style="margin: 0 0 8px 0; font-size: 12px; color: #b91c1c; text-transform: uppercase; letter-spacing: 0.5px;">Motivo Indicado para não Homologação</h4>
              <p style="margin: 0; font-size: 13px; color: #7f1d1d; line-height: 1.6; font-style: italic;">
                "${rejectionReason || "Não atende aos critérios regulamentares mínimos exigidos de segurança operacional, ou dados insuficientes da ficha de agendamento."}"
              </p>
            </div>

            <p style="font-size: 14px; line-height: 1.6; color: #334155;">
              Caso deseje adequar os requisitos, você poderá submeter uma nova solicitação contendo as devidas adequações através do nosso Portal Integrado de Agendamento.
            </p>
          </div>
          
          <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #f1f5f9; font-size: 11px; color: #94a3b8;">
            Este e-mail é gerado de forma automática e integrada pelo portal de Segurança da Wilson Sons.<br />
            Favor não responder diretamente a este endereço.
          </div>
        </div>
      </div>`;
    }

    if (!isSmtpConfigured) {
      console.log(`[SMTP SIMULATION] Real SMTP not configured in env. Simulating email transmission of credential badge to ${request.email}`);
      return res.json({
        success: true,
        smtpConfigured: false,
        message: "E-mail de credencial gerado de forma integrada! Como as variáveis SMTP no ambiente (.env) não estão ativas no momento, o e-mail real não foi transmitido, mas foi arquivado e já pode ser vizualizado na aba 'E-mails Enviados' no Painel Admin.",
        mailLog: {
          id: `ML-${String(Date.now()).slice(-6)}`,
          to: request.email,
          subject: subject,
          date: new Date().toISOString().slice(0, 16).replace("T", " "),
          type: isApproved ? "approval" : "rejection",
          body: isApproved 
            ? `Prezado(a) ${request.fullName},\n\nSua credencial de visita portuária Wilson Sons foi APROVADA com sucesso!\n\nUm e-mail completo contendo seu crachá profissional (85mm x 135mm) com QR Code oficial e foto foi gerado para transmissão.\n\nRegulamento Geral de Segurança do Trabalho e SESMT:\n- Imprima o anexo em tamanho real e traga pendurado no pescoço.\n- Vista calçado fechado antiderrapante e capacete no pátio.\n\nID do Crachá: ${request.id}\nData Agendada: ${dateStr}\nEmail de destino: ${request.email}`
            : `Prezado(a) ${request.fullName},\n\nSua visita portuária não atende aos requisitos de segurança do trabalho no momento.\n\nMotivo da recusa:\n"${rejectionReason || "Não conformidade técnica no preenchimento."}"`,
          htmlBody: htmlBody,
          request: request
        }
      });
    }

    try {
      console.log(`[SMTP TRANSMISSION] Sending real email via SMTP host ${host}:${port} to ${request.email}`);
      
      let transportOpts: any = {
        host: host,
        port: port,
        secure: port === 465, // true for 465, false for other ports
        auth: {
          user: user,
          pass: pass,
        },
        tls: {
          rejectUnauthorized: false
        },
        connectionTimeout: 3500, // Slightly longer timeout for server transitions
        greetingTimeout: 2500,   
        socketTimeout: 6000      
      };

      // If it's a Gmail/Google host, use service: 'gmail' for ultra-robust authentication handshake
      if (host.includes("gmail") || host.includes("google")) {
        transportOpts = {
          service: "gmail",
          auth: {
            user: user,
            pass: pass,
          },
          tls: {
            rejectUnauthorized: false
          }
        };
      }

      const transporter = nodemailer.createTransport(transportOpts);

      const info = await transporter.sendMail({
        from: `"${fromAddr.includes("@") ? "Wilson Sons SESMT" : fromAddr}" <${fromAddr}>`,
        to: request.email,
        subject: subject,
        html: htmlBody,
        attachments: attachments,
        // Plain-text alternative
        text: `Olá ${request.fullName},\n\nSua credencial de visita operacional Wilson Sons foi ${isApproved ? "APROVADA" : "RECUSADA"}.\n\n` + 
              (isApproved ? `ID da Solicitação: ${request.id}\nData Agendada: ${dateStr}\n\nPor favor, acesse o painel para visualizar o crachá impresso.` : `Motivo: ${rejectionReason || "Critérios técnicos de segurança."}`)
      });

      console.log(`[SMTP TRANSMISSION] Email successfully sent in real flight! Message ID: ${info.messageId}`);
      
      return res.json({
        success: true,
        smtpConfigured: true,
        message: `Credencial enviada de forma autêntica com sucesso para o e-mail real: ${request.email}! ID da mensagem: ${info.messageId}`,
        mailLog: {
          id: `ML-${String(Date.now()).slice(-6)}`,
          to: request.email,
          subject: subject,
          date: new Date().toISOString().slice(0, 16).replace("T", " "),
          type: isApproved ? "approval" : "rejection",
          body: isApproved 
            ? `Prezado(a) ${request.fullName},\n\nSua credencial de visita portuária Wilson Sons foi APROVADA com sucesso!\n\nSua credencial (85mm x 135mm) com QR Code oficial e foto foi despachada para o endereço ${request.email}.\n\nID do Crachá: ${request.id}\nData Agendada: ${dateStr}`
            : `Prezado(a) ${request.fullName},\n\nSua visita portuária não atende aos requisitos de segurança do trabalho no momento.\n\nMotivo da recusa:\n"${rejectionReason || "Não conformidade técnica no preenchimento."}"`,
          htmlBody: htmlBody,
          request: request
        }
      });

    } catch (err: any) {
      console.warn("[SMTP FAILSAFE] Real SMTP failed or timed out: ", err.message);
      // Fallback gracefully so approval/rejection is NOT blocked by real mail server outbound connection errors / Cloud Run blocked SMTP ports
      return res.json({
        success: true,
        smtpConfigured: true,
        smtpError: err.message,
        message: `Ficha atualizada com sucesso! O e-mail de credencial foi gerado e está disponível para consulta na aba 'E-mails Enviados' no Painel Admin. (A transmissão direta para o e-mail real falhou: ${err.message}. Isso é normal se portas de e-mail 587/465 estiverem restritas por políticas de segurança do servidor de hospedagem).`,
        mailLog: {
          id: `ML-${String(Date.now()).slice(-6)}`,
          to: request.email,
          subject: subject,
          date: new Date().toISOString().slice(0, 16).replace("T", " "),
          type: isApproved ? "approval" : "rejection",
          body: isApproved 
            ? `Prezado(a) ${request.fullName},\n\nSua credencial de visita portuária Wilson Sons foi APROVADA com sucesso!\n\nSua credencial (85mm x 135mm) de acesso com QR Code oficial foi gerada no sistema.\n\nID do Crachá: ${request.id}\nData Agendada: ${dateStr}\nEmail de destino: ${request.email}`
            : `Prezado(a) ${request.fullName},\n\nSua visita portuária não atende aos requisitos de segurança do trabalho no momento.\n\nMotivo da recusa:\n"${rejectionReason || "Não conformidade técnica no preenchimento."}"`,
          htmlBody: htmlBody,
          request: request
        }
      });
    }
  });
  */

  // Vite development mode middleware or production bundling configuration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Bind exclusively to 0.0.0.0 and port 3000
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Wilson Sons Integrated Dev] Active full-stack portal at http://localhost:${PORT}`);
  });
}

startServer();
