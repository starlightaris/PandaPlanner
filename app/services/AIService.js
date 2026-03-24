import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize with your API Key from Google AI Studio
const genAI = new GoogleGenerativeAI("YOUR_GEMINI_API_KEY");

class AIService {
  constructor() {
    this.model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      generationConfig: { responseMimeType: "application/json" } 
    });
  }

  /**
   * The "Universal" parser for the app
   * @param {string} prompt - The user's typed command or file context
   * @param {object} fileData - Optional { base64, mimeType } for images/PDFs
   */
  async parseSchedule(userInput, fileData = null) {
    const systemInstruction = `
      You are a Schedule Parser. Extract events into a JSON array.
      Format: [{ "title": string, "startTime": "ISO String", "endTime": "ISO String", "location": string }]
      If a year is missing, assume 2026. Current date is ${new Date().toLocaleDateString()}.
    `;

    try {
      let payload = [systemInstruction + userInput];
      
      // If user uploaded a screenshot or file, add it to the request
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
      return JSON.parse(response.text());
    } catch (error) {
      console.error("Gemini Parse Error: ", error);
      return null;
    }
  }
}

export default new AIService();