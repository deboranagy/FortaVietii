require("dotenv").config();

const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");
const fs = require("fs");
const path = require("path");

const app = express();

app.use(cors({ origin: "*" }));
app.use(express.json());

const client = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
  defaultHeaders: {
    "HTTP-Referer": process.env.SITE_URL || "http://localhost:3000",
    "X-Title": "Chatbot Asociatia Forta Vietii",
  },
});

const DATA_DIR = path.join(__dirname, "chatbot-data");
const MODEL_NAME =
  process.env.OPENROUTER_MODEL || "deepseek/deepseek-chat-v3-0324";

function normalizeText(text) {
  return String(text || "")
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ");
}

function cleanResponse(text) {
  if (!text) return "";

  return String(text)
    .replace(/<\/?assistant>/gi, "")
    .replace(/<\/?user>/gi, "")
    .replace(/<\/?system>/gi, "")
    .replace(/<\/?s>/gi, "")
    .replace(/\[\d+\]/g, "")
    .replace(/\*\*/g, "")
    .replace(/##/g, "")
    .replace(/```/g, "")
    .replace(/\*/g, "")
    .replace(/_/g, "")
    .replace(/https?:\/\/[^\s]+/g, "")
    .replace(/\s+([.,!?;:])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function readTxtFilesRecursively(dir) {
  let results = [];

  if (!fs.existsSync(dir)) return results;

  const items = fs.readdirSync(dir, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(dir, item.name);

    if (item.isDirectory()) {
      results = results.concat(readTxtFilesRecursively(fullPath));
    } else if (item.isFile() && item.name.endsWith(".txt")) {
      results.push({
        file: path.relative(DATA_DIR, fullPath),
        content: fs.readFileSync(fullPath, "utf8"),
      });
    }
  }

  return results;
}

function sanitizeHistory(history) {
  if (!Array.isArray(history)) return [];

  return history
    .filter(
      (item) =>
        item &&
        (item.role === "user" || item.role === "assistant") &&
        typeof item.content === "string" &&
        item.content.trim()
    )
    .slice(-8)
    .map((item) => ({
      role: item.role,
      content: item.content.trim().slice(0, 800),
    }));
}

function getRecentHistoryText(history) {
  if (!history || history.length === 0) return "";

  return history
    .slice(-6)
    .map((item) => {
      return item.role === "user"
        ? `Utilizator: ${item.content}`
        : `Asistent: ${item.content}`;
    })
    .join("\n");
}

function getWords(text) {
  const stopWords = [
    "care",
    "este",
    "sunt",
    "prin",
    "pentru",
    "despre",
    "acest",
    "aceasta",
    "acela",
    "acea",
    "unui",
    "unei",
    "din",
    "unde",
    "cine",
    "cand",
    "când",
    "cum",
    "ce",
    "de",
    "la",
    "in",
    "în",
    "si",
    "și",
    "sau",
    "cu",
    "pe",
    "al",
    "ai",
    "ale",
    "proiectul",
    "proiect",
    "departamentul",
    "departament",
    "asociatia",
    "asociația",
    "forta",
    "forța",
    "vietii",
    "vieții",
    "ocupă",
    "ocupa",
    "coordoneaza",
    "coordonează",
    "responsabil",
    "coordonator",
    "coordonatoarea",
    "general",
  ];

  return normalizeText(text)
    .split(" ")
    .filter((word) => word.length > 2 && !stopWords.includes(word));
}

function detectIntent(text) {
  const normalized = normalizeText(text);

  if (
    normalized.includes("cine") ||
    normalized.includes("se ocupa") ||
    normalized.includes("se ocupă") ||
    normalized.includes("coordoneaza") ||
    normalized.includes("coordonează") ||
    normalized.includes("responsabil") ||
    normalized.includes("coordonator") ||
    normalized.includes("lider") ||
    normalized.includes("manager")
  ) {
    return "persoana";
  }

  if (
    normalized.includes("unde") ||
    normalized.includes("locatie") ||
    normalized.includes("locație") ||
    normalized.includes("localitate") ||
    normalized.includes("oras") ||
    normalized.includes("oraș") ||
    normalized.includes("judet") ||
    normalized.includes("județ") ||
    normalized.includes("zona")
  ) {
    return "locatie";
  }

  if (
    normalized.includes("cand") ||
    normalized.includes("când") ||
    normalized.includes("data") ||
    normalized.includes("anul") ||
    normalized.includes("inceput") ||
    normalized.includes("început")
  ) {
    return "data";
  }

  if (
    normalized.includes("scop") ||
    normalized.includes("obiectiv") ||
    normalized.includes("misiune") ||
    normalized.includes("rol")
  ) {
    return "scop";
  }

  if (
    normalized.includes("activitati") ||
    normalized.includes("activități") ||
    normalized.includes("ce face") ||
    normalized.includes("ce se face") ||
    normalized.includes("ce organizeaza") ||
    normalized.includes("ce organizează") ||
    normalized.includes("ce include")
  ) {
    return "activitati";
  }

  if (
    normalized.includes("ce este") ||
    normalized.includes("ce e") ||
    normalized.includes("despre") ||
    normalized.includes("informatii") ||
    normalized.includes("informații") ||
    normalized.includes("detalii")
  ) {
    return "descriere";
  }

  return "general";
}

function getQAEntries() {
  const qaPath = path.join(DATA_DIR, "QA.txt");

  if (!fs.existsSync(qaPath)) return [];

  const qaContent = fs.readFileSync(qaPath, "utf8");
  const sections = qaContent.split("---");
  const entries = [];

  for (const section of sections) {
    const questionMatch = section.match(/INTREBARE:\s*([\s\S]*?)RASPUNS:/i);
    const answerMatch = section.match(/RASPUNS:\s*([\s\S]*)/i);

    if (!questionMatch || !answerMatch) continue;

    entries.push({
      question: questionMatch[1].trim(),
      answer: answerMatch[1].trim(),
    });
  }

  return entries;
}

function calculateScore(query, text) {
  const queryWords = getWords(query);
  const normalizedQuery = normalizeText(query);
  const normalizedText = normalizeText(text);
  const queryIntent = detectIntent(query);

  if (queryWords.length === 0) return 0;

  let score = 0;

  for (const word of queryWords) {
    if (normalizedText.includes(word)) {
      score += 2;
    }
  }

  const longWords = queryWords.filter((word) => word.length > 4);

  for (let i = 0; i < longWords.length - 1; i++) {
    const phrase = `${longWords[i]} ${longWords[i + 1]}`;

    if (normalizedText.includes(phrase)) {
      score += 6;
    }
  }

  if (normalizedText.includes(normalizedQuery)) {
    score += 10;
  }

  if (queryIntent === "persoana") {
    if (
      normalizedText.includes("coordonator") ||
      normalizedText.includes("coordonatoarea") ||
      normalizedText.includes("coordonat de") ||
      normalizedText.includes("responsabil") ||
      normalizedText.includes("responsabila") ||
      normalizedText.includes("persoana responsabila") ||
      normalizedText.includes("se ocupa") ||
      normalizedText.includes("se ocupă")
    ) {
      score += 8;
    }
  }

  if (queryIntent === "locatie") {
    if (
      normalizedText.includes("localitate") ||
      normalizedText.includes("judet") ||
      normalizedText.includes("județ") ||
      normalizedText.includes("oras") ||
      normalizedText.includes("oraș") ||
      normalizedText.includes("zona") ||
      normalizedText.includes("se desfasoara") ||
      normalizedText.includes("are loc")
    ) {
      score += 6;
    }
  }

  if (queryIntent === "data") {
    if (
      normalizedText.includes("data") ||
      normalizedText.includes("anul") ||
      normalizedText.includes("inceput") ||
      normalizedText.includes("început") ||
      normalizedText.includes("a inceput")
    ) {
      score += 6;
    }
  }

  if (queryIntent === "scop") {
    if (
      normalizedText.includes("scop") ||
      normalizedText.includes("obiectiv") ||
      normalizedText.includes("misiune") ||
      normalizedText.includes("isi propune") ||
      normalizedText.includes("își propune")
    ) {
      score += 6;
    }
  }

  if (queryIntent === "activitati") {
    if (
      normalizedText.includes("activitati") ||
      normalizedText.includes("activități") ||
      normalizedText.includes("include") ||
      normalizedText.includes("organizeaza") ||
      normalizedText.includes("organizează") ||
      normalizedText.includes("desfasoara") ||
      normalizedText.includes("desfășoară")
    ) {
      score += 6;
    }
  }

  if (queryIntent === "descriere") {
    if (
      normalizedText.includes("este un") ||
      normalizedText.includes("este o") ||
      normalizedText.includes("reprezinta") ||
      normalizedText.includes("reprezintă") ||
      normalizedText.includes("descriere generala") ||
      normalizedText.includes("descriere generală")
    ) {
      score += 5;
    }
  }

  return score;
}

function getTopQAContext(query, limit = 12) {
  const entries = getQAEntries();

  return entries
    .map((entry) => {
      const text = `${entry.question}\n${entry.answer}`;
      return {
        ...entry,
        score: calculateScore(query, text),
      };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(
      (entry, index) =>
        `QA ${index + 1}\nINTREBARE: ${entry.question}\nRASPUNS: ${entry.answer}`
    )
    .join("\n\n---\n\n");
}

function getTopFileContext(query, limit = 10) {
  const files = readTxtFilesRecursively(DATA_DIR);
  const chunks = [];

  for (const file of files) {
    if (normalizeText(file.file) === "qa txt") continue;

    const content = file.content;
    const chunkSize = 1800;
    const overlap = 400;

    for (let start = 0; start < content.length; start += chunkSize - overlap) {
      const chunk = content.slice(start, start + chunkSize);

      const fileNameScore = calculateScore(query, file.file);
      const chunkScore = calculateScore(query, chunk);

      const score = fileNameScore * 2 + chunkScore;

      if (score > 0) {
        chunks.push({
          file: file.file,
          content: chunk,
          score,
        });
      }
    }
  }

  return chunks
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((chunk, index) => {
      return `DOCUMENT ${index + 1}: ${chunk.file}\n${chunk.content}`;
    })
    .join("\n\n---\n\n");
}

function isContextualFollowUp(message, history) {
  const normalized = normalizeText(message);

  if (!history || history.length < 2) return false;

  const triggers = [
    "dar",
    "iar",
    "si",
    "și",
    "acel",
    "acea",
    "acesta",
    "aceasta",
    "el",
    "ea",
    "nu",
    "atunci",
    "acolo",
    "despre acesta",
    "despre el",
  ];

  return triggers.some((trigger) => normalized.startsWith(trigger));
}

function buildSearchQuestion(message, history) {
  if (!isContextualFollowUp(message, history)) {
    return message;
  }

  const previousUserQuestion = history
    .filter((item) => item.role === "user")
    .slice(-2, -1)[0];

  if (!previousUserQuestion) return message;

  return `${previousUserQuestion.content} ${message}`;
}

async function generateAnswer(question, history) {
  const searchQuestion = buildSearchQuestion(question, history);
  const recentHistory = getRecentHistoryText(history);

  const qaContext = getTopQAContext(searchQuestion);
  const fileContext = getTopFileContext(searchQuestion);

  const context = `
ISTORIC CONVERSATIE:
${recentHistory || "Nu există istoric relevant."}

QA RELEVANT:
${qaContext || "Nu există QA relevant."}

DOCUMENTE RELEVANTE:
${fileContext || "Nu există documente relevante."}
  `.trim();

  if (!qaContext && !fileContext) {
    return "Îmi pare rău, nu am această informație momentan.";
  }

  try {
    const completion = await client.chat.completions.create({
      model: MODEL_NAME,
      temperature: 0,
      max_tokens: 260,
      messages: [
        {
          role: "system",
          content: `
Ești asistentul virtual al Asociației Forța Vieții.

Răspunzi exclusiv pe baza contextului primit: QA relevant, documente relevante și istoricul conversației.
Nu inventa informații.
Nu folosi informații despre alt proiect, alt departament sau altă secțiune decât cea întrebată.
Dacă există conflict între un QA și un document dedicat paginii, documentul dedicat paginii are prioritate.
Dacă utilizatorul întreabă cine se ocupă sau cine coordonează, caută în context persoana responsabilă exact pentru subiectul întrebat.
Dacă utilizatorul întreabă despre o secțiune dintr-un departament, caută persoana asociată exact acelei secțiuni, nu coordonatorul general al departamentului.
Dacă utilizatorul corectează ceva în conversație, ține cont de corecția lui în restul conversației.
Dacă informația nu există clar în context, răspunde exact: Îmi pare rău, nu am această informație momentan.
Nu adăuga niciodată citări de forma [1], [2], [3].
Nu folosi markdown.
Nu folosi taguri HTML sau XML.
Răspunde scurt, clar, natural și în limba română.
          `,
        },
        {
          role: "user",
          content: `
ÎNTREBAREA UTILIZATORULUI:
${question}

ÎNTREBARE PENTRU CĂUTARE:
${searchQuestion}

CONTEXT:
${context}
          `,
        },
      ],
    });

    const answer = cleanResponse(completion?.choices?.[0]?.message?.content || "");

    return answer || "Îmi pare rău, nu am putut genera un răspuns momentan.";
  } catch (error) {
    console.error("Eroare OpenRouter:", error);
    return "Îmi pare rău, nu am putut genera un răspuns momentan.";
  }
}

function getSmallTalkResponse(message) {
  const normalized = normalizeText(message);

  const thanksMessages = [
    "multumesc",
    "mulțumesc",
    "mersi",
    "ms",
    "thanks",
    "thank you",
  ];

  const positiveMessages = [
    "super",
    "perfect",
    "excelent",
    "grozav",
    "minunat",
    "foarte bine",
    "ok",
    "okay",
  ];

  const greetingMessages = [
    "salut",
    "Salut",
    "salutare",
    "buna",
    "bună",
    "hello",
    "hi",
    "hey",
    "hei",
    "ceau",
  ];

  if (
    thanksMessages.some((text) =>
      normalized.includes(normalizeText(text))
    )
  ) {
    return "Cu drag! Mă bucur că te-am putut ajuta.";
  }

  if (
    positiveMessages.some((text) =>
      normalized.includes(normalizeText(text))
    )
  ) {
    return "Mă bucur! Dacă mai ai întrebări despre Asociația Forța Vieții, sunt aici să te ajut.";
  }

  if (
    greetingMessages.some(
      (text) => normalized === normalizeText(text)
    )
  ) {
    return "Bună! Sunt asistentul virtual al Asociației Forța Vieții. Cu ce te pot ajuta?";
  }

  return null;
}

app.get("/", (req, res) => {
  res.send("Serverul chatbot merge!");
});

app.post("/chat", async (req, res) => {
  try {
    const userMessage = req.body.message;
    const history = sanitizeHistory(req.body.history);

    if (!userMessage) {
      return res.status(400).json({
        error: "Mesajul este obligatoriu.",
      });
    }

    const smallTalkResponse = getSmallTalkResponse(userMessage);

    if (smallTalkResponse) {
     return res.json({
       reply: smallTalkResponse,
     });
    }

    const reply = await generateAnswer(userMessage, history);

    return res.json({
      reply: cleanResponse(reply),
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "A apărut o eroare la comunicarea cu OpenRouter API.",
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server pornit pe portul ${PORT}`);
});
