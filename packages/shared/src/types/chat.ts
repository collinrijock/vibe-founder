export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
  aspectContext?: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  aspectFocus?: string;
}

export interface QuestionOption {
  id: string;
  label: string;
}

export interface FounderQuestion {
  id: string;
  prompt: string;
  options: QuestionOption[];
  allowMultiple?: boolean;
}
