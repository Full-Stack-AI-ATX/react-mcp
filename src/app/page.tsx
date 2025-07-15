'use client'

import type { Topic, Message }  from '@Types/workspace';

import { useState }             from 'react';
import { PanelLeftClose }       from 'lucide-react';

import TopicCard                from '@Components/topicCard';
import ChatInterface            from '@Components/chatInterface';
import ThemeToggle              from '@Components/themeToggle';
import Button                   from '@Components/ui/button';

import { topics }               from '../data/topics';
import { sampleConversations }  from '../data/sample-conversations';

import styles                   from './styles.module.css';


function Page() {
  const [activeTopic, setActiveTopic] = useState<Topic | null>(null)
  const [messages, setMessages] = useState<Message[]>(Object.values(sampleConversations).flat())
  const [sidebarVisible, setSidebarVisible] = useState(false)

  const handleTopicSelect = (topic: Topic) => {
    // If the same topic is clicked again, deselect it (return to general chat)
    if (activeTopic?.id === topic.id) {
      setActiveTopic(null)
    } else {
      setActiveTopic(topic)
    }
  }

  const handleSendMessage = (content: string) => {
    const topicId = activeTopic?.id || "general"

    const userMessage: Message = {
      id: Date.now().toString(),
      content,
      role: "user",
      timestamp: new Date(),
      topicId,
    }

    setMessages((prev) => [...prev, userMessage])

    // Simulate Agent response
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: getAIResponse(topicId, content),
        role: "assistant",
        timestamp: new Date(),
        topicId,
      }
      setMessages((prev) => [...prev, aiResponse])
    }, 1000)
  }

  const getAIResponse = (topicId: string, userMessage: string): string => {
    const responses: Record<string, string[]> = {
      general: [
        "I can help you with any aspect of your infrastructure. What would you like to know?",
        "Based on your current setup, everything looks healthy. Is there a specific area you'd like me to focus on?",
        "I can provide insights across all your systems - database, security, kubernetes, observability, analytics, and infrastructure. What interests you most?",
        "Your infrastructure is performing well overall. Would you like me to dive into any specific metrics or issues?",
        "I'm here to help with any questions about your systems. You can also select a specific topic on the sides for specialized assistance.",
      ],
      database: [
        "I can help you with database operations. What specific task would you like to perform?",
        "Database query executed successfully. Here are the results...",
        "Migration completed. All tables have been updated to the latest schema.",
      ],
      observability: [
        "Checking system metrics... Everything looks good with 99.9% uptime.",
        "I found some performance bottlenecks in your API responses. Here's what I recommend...",
        "Alert configured successfully. You'll be notified when latency exceeds 100ms.",
      ],
      kubernetes: [
        "Kubernetes cluster is healthy. All 12 nodes are operational.",
        "Scaling deployment to 5 replicas... This will take about 2 minutes.",
        "Pod logs show normal operation. No errors detected in the last 24 hours.",
      ],
      security: [
        "Security scan completed. Found 2 medium-priority vulnerabilities that need attention.",
        "API security policies have been updated. All endpoints now require authentication.",
        "Compliance report generated. You're meeting 94% of security requirements.",
      ],
      analytics: [
        "Analytics dashboard updated with latest data. Traffic is up 15% this week.",
        "Report generated successfully. I've identified 3 key insights for your review.",
        "Data pipeline is running smoothly. All ETL jobs completed on schedule.",
      ],
      infrastructure: [
        "Infrastructure costs optimized. I found $200/month in potential savings.",
        "Auto-scaling configured for peak traffic hours. Resources will adjust automatically.",
        "Cloud resources are running efficiently at 87% optimization score.",
      ],
    }

    const topicResponses = responses[topicId] || responses.general
    return topicResponses[Math.floor(Math.random() * topicResponses.length)]
  }

  const toggleSidebar = () => {
    setSidebarVisible(!sidebarVisible)
  }

  return (
    <div className={styles.dashboardContainer}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div>
            <h1 className={styles.title}>Agentic Workspace</h1>
            <p className={styles.subtitle}>Your intelligent command center</p>
          </div>
          <div className={styles.headerRight}>
            <ThemeToggle />
            <Button
              variant="outline"
              size="sm"
              onClick={toggleSidebar}
              className={styles.toggleButton}
            >
              <PanelLeftClose className={`${styles.toggleIcon} ${sidebarVisible ? "" : styles.toggleIconRotated}`} />
              <span>{sidebarVisible ? "Hide Panels" : "Show Panels"}</span>
            </Button>
            <div className={styles.topicStatus}>
              {topics.filter((t) => t.status === "active").length} active topics
            </div>
          </div>
        </div>
      </header>

      <div className={styles.mainContent}>
        <div className={styles.workspaceWrapper}>
          {/* Left Topics Column */}
          {sidebarVisible && (
            <div className={`${styles.sidebar} ${styles.leftSidebar}`}>
              <div className={styles.sidebarContent}>
                <div>
                  <h2 className={styles.sidebarTitle}>Infrastructure</h2>
                  <div className={styles.topicGrid}>
                    {topics.slice(0, 3).map((topic) => (
                      <TopicCard
                        key={topic.id}
                        topic={topic}
                        isActive={activeTopic?.id === topic.id}
                        onClick={() => handleTopicSelect(topic)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Chat Interface - Middle */}
          <div className={`${styles.chatContainer} ${!sidebarVisible ? styles.chatContainerCollapsed : ""}`}>
            <ChatInterface activeTopic={activeTopic} />
          </div>

          {/* Right Topics Column */}
          {sidebarVisible && (
            <div className={`${styles.sidebar} ${styles.rightSidebar}`}>
              <div className={styles.sidebarContent}>
                <div>
                  <h2 className={styles.sidebarTitle}>Operations</h2>
                  <div className={styles.topicGrid}>
                    {topics.slice(3, 6).map((topic) => (
                      <TopicCard
                        key={topic.id}
                        topic={topic}
                        isActive={activeTopic?.id === topic.id}
                        onClick={() => handleTopicSelect(topic)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


export default Page;
