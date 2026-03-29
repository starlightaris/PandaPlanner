import { GenerativeModel, GoogleGenerativeAI } from "@google/generative-ai";
import { PlannerEvent } from "../services/FirebaseService"; // Ensure this path is correct

const genAI = new GoogleGenerativeAI(process.env.EXPO_PUBLIC_GEMINI_API_KEY as string);

class AIService {
  private model: GenerativeModel;

  constructor() {
    this.model = genAI.getGenerativeModel({ 
      // Using Flash 1.5 for speed and multimodal capabilities as per your report
      model: "gemini-1.5-flash",
      generationConfig: { 
        responseMimeType: "application/json", 
        temperature: 0.1 // Low temperature for higher factual accuracy [cite: 170]
      } 
    });
  }

  /**
   * Parses unstructured schedule data from text or files (PNG, JPG, CSV, XLSX).
   * Aligns with the "AI Ingestion Pipeline" described in Chapter 4.
   */
  async parseSchedule(
    userInput: string = "Extract events from this file", 
    fileData: { base64: string; mimeType: string } | null = null
  ): Promise<PlannerEvent[] | null> {
    
    // Strict system instructions to handle "Dirty Data" and ensure JSON consistency
    const systemInstruction = `
      You are a Schedule Parser for Panda Planner. Your task is to extract events into a standardized JSON array.
      
      Rules:
      1. Output MUST be a JSON array of objects.
      2. Keys: "title" (string), "startTime" (ISO 8601 string), "endTime" (ISO 8601 string), "location" (string), "category" (string).
      3. If a year is missing in the source, assume 2026[cite: 15, 83].
      4. If an end time is missing, set it to 1 hour after the start time.
      5. Current date for context: ${new Date().toDateString()}.
      
      Target Format:
      [{ "title": "Lecture", "startTime": "2026-03-05T09:00:00Z", "endTime": "2026-03-05T10:00:00Z", "location": "Hall A", "category": "Academic" }]
    `;

    try {
      let contents: any[] = [{ text: systemInstruction + "\nUser Input: " + userInput }];
      
      if (fileData) {
        contents.push({
          inlineData: {
            data: fileData.base64,
            mimeType: fileData.mimeType // Supports image/png, image/jpeg, text/csv, etc. [cite: 83, 99]
          }
        });
      }

      const result = await this.model.generateContent({ contents });
      const response = result.response;
      let text = response.text();
      text = text.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsedData = JSON.parse(text);

      // Map the AI response to your Firebase-ready PlannerEvent structure 
      return parsedData.map((event: any) => ({
        ...event,
        startTime: new Date(event.startTime),
        endTime: new Date(event.endTime),
        source: "AI_Scan" // Mark as AI-generated for the "Universal Timeline" 
      })) as PlannerEvent[];

    } catch (error) {
      console.error("Gemini Parse Error: ", error);
      return null;
    }
  }
}

export default new AIService();