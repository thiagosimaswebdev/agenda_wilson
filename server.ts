import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

// Initialize Gemini client securely server-side
const apiKey = process.env.GEMINI_API_KEY;
let aiClient: GoogleGenAI | null = null;

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
  app.use(express.json());

  const configPath = path.join(process.cwd(), "form-config.json");

  function readConfig() {
    try {
      if (fs.existsSync(configPath)) {
        const data = fs.readFileSync(configPath, "utf-8");
        return JSON.parse(data);
      }
    } catch (e) {
      console.error("Erro ao ler form-config.json:", e);
    }
    return {
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
      }
    };
  }

  function saveConfig(config: any) {
    try {
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8");
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
        mappings: resolvedMappings
      });
    } catch (e) {
      return res.json(config);
    }
  });

  app.post("/api/config", (req, res) => {
    const { googleFormsUrl, mappings } = req.body;
    if (!googleFormsUrl) {
      return res.status(400).json({ success: false, error: "A URL do Google Forms é obrigatória." });
    }
    const success = saveConfig({ googleFormsUrl, mappings: mappings || {} });
    
    // Invalidate/reset the memory cache upon explicit updates
    cachedMappings = mappings || null;
    cachedUrl = googleFormsUrl;
    lastScrapeTime = Date.now();

    return res.json({ success });
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
      purpose 
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
      if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey === "MOCK_KEY_IF_ABSENT") {
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
      console.error("Gemini API Error in /api/analyze-objective:", err);
      return res.status(500).json({ 
        error: "Erro do provedor operacional de IA ao analisar objetivo de visita.", 
        details: err.message 
      });
    }
  });

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
