export interface ScriptSection {
  title: string;
  paragraphs: string[];
}

export interface GeneratedContent {
  summary: string;
  script: ScriptSection[];
}

export interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  text: string;
}