'use client';

import type React                       from 'react';
import type { Topic, Message }          from '@Types/workspace';

import { useState, useRef, useEffect }  from 'react';
import { Send, Bot, User }              from 'lucide-react';

import  Button                        from '@Components/ui/button';
import  Input                         from '@Components/ui/input';
import  ScrollArea                    from '@Components/ui/scrollArea';
import { Avatar, AvatarFallback }     from '@Components/ui/avatar';
import  Badge                         from '@Components/ui/badge';

import styles                           from './styles.module.css';


interface ChatInterfaceProps {
  activeTopic: Topic | null
  messages: Message[]
  onSendMessage: (content: string) => void
}

const ClientOnly = ({ children }: { children: React.ReactNode }) => {
  const [hasMounted, setHasMounted] = useState(false)

  useEffect(() => {
    setHasMounted(true)
  }, [])

  if (!hasMounted) {
    return null
  }

  return <>{children}</>
}

function ChatInterface({ activeTopic, messages, onSendMessage }: ChatInterfaceProps) {
  const [input, setInput] = useState("")
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = () => {
    if (input.trim()) {
      onSendMessage(input.trim())
      setInput("")
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const renderMessage = (message: Message) => (
    <div
      key={message.id}
      className={`${styles.messageRow} ${
        message.role === "user" ? styles.messageRowUser : ""
      }`}
    >
      <Avatar className={styles.avatar}>
        <AvatarFallback>
          {message.role === "user" ? <User className={styles.avatarIcon} /> : <Bot className={styles.avatarIcon} />}
        </AvatarFallback>
      </Avatar>
      <div
        className={`${styles.messageContent} ${
          message.role === "user" ? styles.userMessage : styles.assistantMessage
        }`}
      >
        <p className={styles.messageText}>{message.content}</p>
        <p className={styles.timestamp}>
          <ClientOnly>{message.timestamp.toLocaleTimeString()}</ClientOnly>
        </p>
      </div>
    </div>
  );

  if (!activeTopic) {
    // Show general purpose chat instead of empty state
    const generalMessages = messages.filter((m) => m.topicId === "general")

    return (
      <div className={styles.container}>
        {/* General Chat Header */}
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <div className={`${styles.iconWrapper} ${styles.generalIconWrapper}`}>
              <Bot className={styles.icon} />
            </div>
            <div>
              <h2 className={styles.title}>General Agent Assistant</h2>
              <p className={styles.description}>Ask me anything about your infrastructure and operations</p>
            </div>
            <Badge variant="outline" className={styles.badge}>
              Ready
            </Badge>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className={styles.scrollArea} ref={scrollAreaRef}>
          <div className={styles.messagesContainer}>
            {generalMessages.length === 0 ? (
              <div className={styles.emptyStateContainer}>
                <Bot className={styles.emptyStateIcon} />
                <div>
                  <h3 className={styles.emptyStateTitle}>Welcome to your Agentic Workspace</h3>
                  <p className={styles.emptyStateDescription}>
                    I can help you with general questions about your infrastructure, or select a specific topic for
                    specialized assistance.
                  </p>
                </div>
              </div>
            ) : (
              generalMessages.map(renderMessage)
            )}
          </div>
        </ScrollArea>

        {/* Input */}
        <div className={styles.inputContainer}>
          <div className={styles.inputWrapper}>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything about your infrastructure..."
              className={styles.input}
            />
            <Button onClick={handleSend} disabled={!input.trim()}>
              <Send className={styles.sendIcon} />
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const topicMessages = messages.filter((m) => m.topicId === activeTopic.id)

  return (
    <div className={styles.container}>
      {/* Chat Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          {/* AIDEV-NOTE: The background color is passed as an inline style because it's a dynamic value from the topic data. */}
          <div className={styles.iconWrapper} style={{ backgroundColor: activeTopic.color }}>
            <Bot className={styles.icon} />
          </div>
          <div>
            <h2 className={styles.title}>{activeTopic.name} Assistant</h2>
            <p className={styles.description}>Specialized in {activeTopic.description.toLowerCase()}</p>
          </div>
          <Badge variant="outline" className={styles.badge}>
            {activeTopic.status}
          </Badge>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className={styles.scrollArea} ref={scrollAreaRef}>
        <div className={styles.messagesContainer}>
          {topicMessages.length === 0 ? (
            <div className={styles.emptyStateContainer}>
              <p className={styles.emptyStateDescription}>Start a conversation about {activeTopic.name.toLowerCase()}</p>
            </div>
          ) : (
            topicMessages.map(renderMessage)
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className={styles.inputContainer}>
        <div className={styles.inputWrapper}>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={`Ask about ${activeTopic.name.toLowerCase()}...`}
            className={styles.input}
          />
          <Button onClick={handleSend} disabled={!input.trim()}>
            <Send className={styles.sendIcon} />
          </Button>
        </div>
      </div>
    </div>
  )
}


export default ChatInterface;
