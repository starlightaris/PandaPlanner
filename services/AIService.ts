import { GenerativeModel, GoogleGenerativeAI } from "@google/generative-ai";
import { PlannerEvent } from "./FirebaseService";

class AIService {
  private genAI: GoogleGenerativeAI;
  private model: GenerativeModel;

  constructor() {
    this.genAI = new GoogleGenerativeAI("AIzaSyCWFIOT_qNWw1yYPgFODuvpK774jTPEYcw");

    this.model = this.genAI.getGenerativeModel({
      model: "gemini-2.5-flash-lite",
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.1,
      },
    });
  }

  async parseSchedule(
    userInput: string,
    fileData: { base64: string; mimeType: string } | null = null
  ): Promise<PlannerEvent[] | null> {
    const now = new Date();
    // Using toDateString() gives the AI a clearer "Day Month Date Year" context
    const todayContext = now.toDateString(); 

    const systemInstruction = `
You are a Schedule Parser for Panda Planner.
Context: Today is ${todayContext}.

Your job: Extract events from user input into a JSON array.
Rules:
1. If the user says "tomorrow", use the date after ${todayContext}.
2. If only a generic phrase like "Meeting" is given, use it as the title.
3. If no endTime is given, set it to 1 hour after startTime.
4. If no year is mentioned, use 2026.

STRICT JSON FORMAT:
[
  {
    "title": "string",
    "startTime": "YYYY-MM-DDTHH:mm:ss",
    "endTime": "YYYY-MM-DDTHH:mm:ss",
    "location": "string",
    "category": "string"
  }
]
RETURN ONLY THE JSON ARRAY.
`;

    try {
      const prompt = `${systemInstruction}\nUser Input: "${userInput}"`;
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      let text = response.text().trim();

      console.log("🤖 RAW AI RESPONSE:", text);

      // Extract JSON array even if the AI includes Markdown backticks or prose
      const startBracket = text.indexOf('[');
      const endBracket = text.lastIndexOf(']');
      
      if (startBracket === -1 || endBracket === -1) {
        console.error("❌ No JSON array found in response");
        return null;
      }

      const jsonString = text.substring(startBracket, endBracket + 1);
      let parsedData = JSON.parse(jsonString);

      if (!Array.isArray(parsedData)) {
        parsedData = [parsedData];
      }

      // ---------- EVENT MAPPING ----------
      return parsedData.map((event: any) => {
        // Fallback chain for various possible key names
        const rawStart = event.startTime || event.start || event.time || event.dateTime;
        const startD = new Date(rawStart);

        const rawEnd = event.endTime || event.end;
        const endD = rawEnd ? new Date(rawEnd) : new Date(startD.getTime() + 3600000);

        // Final validation to ensure we return Date objects, not strings
        const finalStart = isNaN(startD.getTime()) ? new Date() : startD;
        const finalEnd = isNaN(endD.getTime()) 
          ? new Date(finalStart.getTime() + 3600000) 
          : endD;

        return {
          title: event.title || "New Event",
          startTime: finalStart,
          endTime: finalEnd,
          location: event.location || "General",
          category: event.category || "Task",
          source: "AI_Scan",
        } as PlannerEvent;
      });
    } catch (error) {
      console.error("❌ Gemini Service Error:", error);
      return null;
    }
  }
}

export default new AIService();