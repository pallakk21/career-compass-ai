const { GoogleGenAI } = require("@google/genai");
const { z } = require("zod");
const { zodToJsonSchema } = require("zod-to-json-schema");
const puppeteer = require("puppeteer");

// Ensure API key exists
if (!process.env.GOOGLE_GENAI_API_KEY) {
  throw new Error("Missing GOOGLE_GENAI_API_KEY in environment variables");
}

const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_GENAI_API_KEY,
});

const interviewReportSchema = z.object({
  matchScore: z
    .number()
    .describe(
      "A score between 0 and 100 indicating how well the candidate's profile matches the job description"
    ),

  technicalQuestions: z
    .array(
      z.object({
        question: z
          .string()
          .describe("The technical question that can be asked in the interview"),
        intention: z
          .string()
          .describe("The interviewer's intention behind asking this question"),
        answer: z
          .string()
          .describe(
            "How to answer this question, what points to cover, and what approach to take"
          ),
      })
    )
    .describe(
      "Technical questions that can be asked in the interview along with their intention and how to answer them"
    ),

  behavioralQuestions: z
    .array(
      z.object({
        question: z
          .string()
          .describe("The behavioral question that can be asked in the interview"),
        intention: z
          .string()
          .describe("The interviewer's intention behind asking this question"),
        answer: z
          .string()
          .describe(
            "How to answer this question, what points to cover, and what approach to take"
          ),
      })
    )
    .describe(
      "Behavioral questions that can be asked in the interview along with their intention and how to answer them"
    ),

  skillGaps: z
    .array(
      z.object({
        skill: z.string().describe("The skill which the candidate is lacking"),
        severity: z
          .enum(["low", "medium", "high"])
          .describe(
            "The severity of this skill gap and how much it can impact the candidate's chances"
          ),
      })
    )
    .describe("List of skill gaps in the candidate's profile along with severity"),

  preparationPlan: z
    .array(
      z.object({
        day: z
          .number()
          .describe("The day number in the preparation plan, starting from 1"),
        focus: z
          .string()
          .describe(
            "The main focus of this day in the preparation plan, e.g. DSA, system design, mock interviews"
          ),
        tasks: z
          .array(z.string())
          .describe("List of tasks to complete on that day"),
      })
    )
    .describe(
      "A day-wise preparation plan for the candidate to follow in order to prepare effectively"
    ),

  title: z.string().describe("The title of the job for which the report is generated"),
});

async function generateInterviewReport({
  resume,
  selfDescription,
  jobDescription,
}) {
  try {
    const prompt = `
Generate an interview report for a candidate with the following details:

Resume:
${resume}

Self Description:
${selfDescription}

Job Description:
${jobDescription}
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: zodToJsonSchema(interviewReportSchema),
      },
    });

    if (!response || !response.text) {
      throw new Error("No response received from Gemini API");
    }

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Error generating interview report:", error);
    throw error;
  }
}

async function generatePdfFromHtml(htmlContent) {
  let browser;

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "20mm",
        bottom: "20mm",
        left: "15mm",
        right: "15mm",
      },
    });

    return pdfBuffer;
  } catch (error) {
    console.error("Error generating PDF:", error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

async function generateResumePdf({
  resume,
  selfDescription,
  jobDescription,
}) {
  try {
    const resumePdfSchema = z.object({
      html: z
        .string()
        .describe(
          "The HTML content of the resume which can be converted to PDF using puppeteer"
        ),
    });

    const prompt = `
Generate a professional ATS-friendly resume for a candidate with the following details:

Resume:
${resume}

Self Description:
${selfDescription}

Job Description:
${jobDescription}

Requirements:
- Return a JSON object with a single field "html"
- "html" should contain complete HTML for the resume
- The resume should be tailored to the given job description
- Highlight relevant experience, skills, and strengths
- Make it look human-written and professional
- Keep the design simple, clean, and ATS-friendly
- The resume should ideally fit within 1-2 pages
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: zodToJsonSchema(resumePdfSchema),
      },
    });

    if (!response || !response.text) {
      throw new Error("No response received from Gemini API");
    }

    const jsonContent = JSON.parse(response.text);

    if (!jsonContent.html) {
      throw new Error("Gemini did not return valid HTML resume content");
    }

    const pdfBuffer = await generatePdfFromHtml(jsonContent.html);
    return pdfBuffer;
  } catch (error) {
    console.error("Error generating resume PDF:", error);
    throw error;
  }
}

module.exports = {
  generateInterviewReport,
  generateResumePdf,
};