import { GenerativeModel, GoogleGenerativeAI } from "@google/generative-ai";

// Interface to standardize AI output
export interface ParsedEvent {
  title: string;
  startTime: string; // ISO String from AI
  endTime: string;   // ISO String from AI
  location?: string;
  category?: string;
  source?: string;
}

const genAI = new GoogleGenerativeAI(process.env.EXPO_PUBLIC_GEMINI_API_KEY as string);

class AIService {
  private model: GenerativeModel;

  constructor() {
    this.model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      generationConfig: { responseMimeType: "application/json", temperature: 0.1 } 
    });
  }

  async parseSchedule(userInput: string, fileData: { base64: string; mimeType: string } | null = null): Promise<ParsedEvent[] | null> {
    const systemInstruction = `
      You are a Schedule Parser. Extract events into a JSON array.
      Format: [{ "title": string, "startTime": "ISO String", "endTime": "ISO String", "location": string }]
      If a year is missing, assume 2026. Current date is ${new Date().toLocaleDateString()}.
    `;

    try {
      let payload: any[] = [systemInstruction + userInput];
      
      if (fileData) {
        payload.push({
          inlineData: {
            data: fileData.base64,
            mimeType: fileData.mimeType
          }
        });
      }

      const result = await this.model.generateContent(payload);
      const response = result.response;
      return JSON.parse(response.text()) as ParsedEvent[];
    } catch (error) {
      console.error("Gemini Parse Error: ", error);
      return null;
    }
  }
}

export default new AIService();