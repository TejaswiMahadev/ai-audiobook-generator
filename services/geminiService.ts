import { GoogleGenAI, Type, Part, Modality } from "@google/genai";
import type { GeneratedContent, ScriptSection } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    summary: {
      type: Type.STRING,
      description: "A concise, one-paragraph summary of the entire content."
    },
    script: {
      type: Type.ARRAY,
      description: "The structured script, partitioned into sections.",
      items: {
        type: Type.OBJECT,
        properties: {
          title: {
            type: Type.STRING,
            description: "The title of this section of the script."
          },
          paragraphs: {
            type: Type.ARRAY,
            description: "An array of strings, where each string is a paragraph for narration.",
            items: {
              type: Type.STRING,
            }
          }
        },
        required: ["title", "paragraphs"]
      }
    }
  },
  required: ["summary", "script"]
};

export const generateScript = async (
  textContent: string,
  image?: { data: string; mimeType: string } | null
): Promise<GeneratedContent> => {
  const prompt = `
    You are an expert instructional designer and content strategist. Your task is to transform the following content (which may include text and/or an image) into a concise summary and a well-structured narrative script, suitable for an audiobook.

    **Rules:**
    1.  **Summary:** Provide a single, concise paragraph summarizing the entire content.
    2.  **Script:**
        - Partition the content into logical sections. Each section must have a descriptive title.
        - Within each section, break down the information into clear, digestible paragraphs of a few sentences each.
        - The language must be clear, engaging, and suitable for audio narration.
        - Ensure the script flows logically and provides a comprehensive overview of the original content.

    Based on the content provided, generate a JSON object that strictly follows the provided schema. Do not include any introductory text, markdown formatting, or anything outside of the JSON object itself.

    Text Content/Prompt:
    ---
    ${textContent}
    ---
  `;

  const contents: { parts: Part[] } = { parts: [{ text: prompt }] };

  if (image) {
    const base64Data = image.data.split(',')[1];
    if (!base64Data) {
      throw new Error("Invalid image data provided.");
    }
    contents.parts.unshift({
      inlineData: {
        mimeType: image.mimeType,
        data: base64Data,
      },
    });
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: contents,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.5,
      },
    });
    
    const jsonText = response.text.trim();
    const parsedJson = JSON.parse(jsonText);
    return parsedJson as GeneratedContent;

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw new Error("Failed to generate content from Gemini API.");
  }
};

export const generateSpeech = async (textToSpeak: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: textToSpeak }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' }, // A smart, natural voice
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      throw new Error("No audio data received from TTS API.");
    }
    return base64Audio;
  } catch (error) {
    console.error("Error calling Gemini TTS API:", error);
    throw new Error("Failed to generate speech from Gemini API.");
  }
};

export const askAssistant = async (question: string, context: string): Promise<string> => {
  const prompt = `
    You are a helpful AI assistant. Your task is to answer the user's question based ONLY on the provided context.
    Do not use any external knowledge. If the answer is not in the context, say that you cannot find the answer in the provided text.
    Keep your answer concise and to the point.

    CONTEXT:
    ---
    ${context}
    ---

    USER'S QUESTION:
    ---
    ${question}
    ---
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Error asking assistant:", error);
    throw new Error("Failed to get an answer from the assistant.");
  }
};