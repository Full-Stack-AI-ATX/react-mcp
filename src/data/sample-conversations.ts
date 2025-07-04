import type { Message } from "../types/workspace"

export const sampleConversations: Record<string, Message[]> = {
  general: [
    {
      id: "general-1",
      content: "What's the overall status of my infrastructure?",
      role: "user",
      timestamp: new Date(Date.now() - 900000),
      topicId: "general",
    },
    {
      id: "general-2",
      content:
        "Your infrastructure is running well overall! Here's a quick summary:\n\n• Database: 45 active connections, 12ms avg latency ✅\n• Observability: 99.9% uptime, 1 warning alert ⚠️\n• Kubernetes: 12 nodes healthy, 156 pods running ✅\n• Security: 2 threats detected, needs attention 🚨\n• Analytics: All pipelines running smoothly ✅\n• Infrastructure: 87% efficiency, $1,247/mo cost ✅\n\nWould you like me to dive deeper into any specific area?",
      role: "assistant",
      timestamp: new Date(Date.now() - 899000),
      topicId: "general",
    },
  ],
  database: [
    {
      id: "1",
      content: "Show me the current database connection status",
      role: "user",
      timestamp: new Date(Date.now() - 300000),
      topicId: "database",
    },
    {
      id: "2",
      content:
        "All database connections are healthy. You have 45 active connections with an average query time of 12ms. The primary database is at 68% capacity.",
      role: "assistant",
      timestamp: new Date(Date.now() - 299000),
      topicId: "database",
    },
  ],
  observability: [
    {
      id: "3",
      content: "What are the current error rates across our APIs?",
      role: "user",
      timestamp: new Date(Date.now() - 600000),
      topicId: "observability",
    },
    {
      id: "4",
      content:
        "Current error rates: API Gateway: 0.2%, User Service: 0.1%, Payment Service: 0.8% (⚠️ elevated). There are 3 active errors and 1 alert requiring attention.",
      role: "assistant",
      timestamp: new Date(Date.now() - 599000),
      topicId: "observability",
    },
  ],
  kubernetes: [
    {
      id: "5",
      content: "How many pods are running and what's the cluster health?",
      role: "user",
      timestamp: new Date(Date.now() - 120000),
      topicId: "kubernetes",
    },
    {
      id: "6",
      content:
        "Cluster Status: 12 nodes, 156 pods running. CPU usage at 68%, Memory at 72%. All nodes are healthy. 3 pods are pending deployment.",
      role: "assistant",
      timestamp: new Date(Date.now() - 119000),
      topicId: "kubernetes",
    },
  ],
  security: [
    {
      id: "7",
      content: "Show me the latest security scan results",
      role: "user",
      timestamp: new Date(Date.now() - 30000),
      topicId: "security",
    },
    {
      id: "8",
      content:
        "🚨 Security Alert: 2 high-priority threats detected. API endpoints /admin and /users have potential vulnerabilities. Compliance score: 94%. Daily scans are active.",
      role: "assistant",
      timestamp: new Date(Date.now() - 29000),
      topicId: "security",
    },
  ],
}
