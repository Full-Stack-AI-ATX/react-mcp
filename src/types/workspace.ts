export interface Topic {
  id: string
  name: string
  description: string
  icon: string
  color: string
  status: "active" | "warning" | "error" | "idle"
  lastActivity?: string
  metrics?: Record<string, any>
}

export interface Message {
  id: string
  content: string
  role: "user" | "assistant"
  timestamp: Date
  topicId: string
  attachments?: any[]
}

export interface ChatSession {
  topicId: string
  messages: Message[]
  context: Record<string, any>
}
