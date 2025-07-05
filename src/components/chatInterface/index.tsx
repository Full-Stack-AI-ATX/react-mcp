'use client';

import type React from 'react';
import type { Topic } from '@Types/workspace';
import type { Message } from 'ai/react';

import { useRef, useEffect } from 'react';
import { Send, Bot, User, Trash2 } from 'lucide-react';
import { useChat } from '@ai-sdk/react';

import Button from '@Components/ui/button';
import Input from '@Components/ui/input';
import ScrollArea from '@Components/ui/scrollArea';
import { Avatar, AvatarFallback } from '@Components/ui/avatar';
import Badge from '@Components/ui/badge';
import AgentIntro from '@Components/agentIntro';
import MarkdownRenderer from '@Components/markdownRenderer';

import styles from './styles.module.css';

interface ChatInterfaceProps {
  activeTopic: Topic | null;
}

function ChatInterface({ activeTopic }: ChatInterfaceProps) {
  const { messages, input, handleInputChange, handleSubmit, setMessages, status } = useChat({
    id: activeTopic?.id ?? 'general',
    api: '/api/chat',
  });

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const hasMessages = messages.length > 0;

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const clearHistory = () => {
    setMessages([]);
  };

  const renderMessage = (message: Message) => (
    <div
      key={message.id}
      className={`${styles.messageRow} ${
        message.role === 'user' ? styles.messageRowUser : ''
      }`}
    >
      <Avatar className={styles.avatar}>
        <AvatarFallback>
          {message.role === 'user' ? <User className={styles.avatarIcon} /> : <Bot className={styles.avatarIcon} />}
        </AvatarFallback>
      </Avatar>
      <div
        className={`${styles.messageContent} ${
          message.role === 'user' ? styles.userMessage : styles.assistantMessage
        }`}
      >
        <div className={styles.messageText}>
          <MarkdownRenderer content={message.content} />
        </div>
        {message.createdAt && (
          <p className={styles.timestamp}>
            {message.createdAt.toLocaleTimeString()}
          </p>
        )}
      </div>
    </div>
  );

  const headerContent = (
    <>
      {activeTopic ? (
        <>
          <div className={styles['iconWrapper']} style={{ backgroundColor: activeTopic.color }}>
            <Bot className={styles['icon']} />
          </div>
          <div>
            <h2 className={styles['title']}>{activeTopic.name} Assistant</h2>
            <p className={styles['description']}>Specialized in {activeTopic.description.toLowerCase()}</p>
          </div>
          <Badge variant="outline" className={styles['badge']}>
            {status}
          </Badge>
        </>
      ) : (
        <>
          <div className={`${styles['iconWrapper']} ${styles['generalIconWrapper']}`}>
            <Bot className={styles['icon']} />
          </div>
          <div>
            <h2 className={styles['title']}>General Agent Assistant</h2>
            <p className={styles['description']}>Ask me anything about your infrastructure and operations</p>
          </div>
          <Badge variant="outline" className={styles['badge']}>
            {status}
          </Badge>
        </>
      )}
      <Button variant="ghost" size="icon" onClick={clearHistory} className={styles.clearButton}>
        <Trash2 size={16} />
      </Button>
    </>
  );

  if (!hasMessages) {
    return (
      <div className={`${styles['container']} ${styles.initial}`}>
        <div className={styles['header']}>
          <div className={styles['headerContent']}>{headerContent}</div>
        </div>
        <div className={styles.centeredContent}>
          <AgentIntro />
          <form onSubmit={handleSubmit} className={styles['inputContainer']}>
            <div className={styles['inputWrapper']}>
              <Input
                value={input}
                onChange={handleInputChange}
                placeholder={
                  activeTopic
                    ? `Ask about ${activeTopic.name.toLowerCase()}...`
                    : 'Ask me anything about your infrastructure...'
                }
                className={styles['input']}
              />
              <Button type="submit" disabled={!input.trim() || status === 'submitted'}>
                <Send className={styles['sendIcon']} />
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className={styles['container']}>
      {/* Chat Header */}
      <div className={styles['header']}>
        <div className={styles['headerContent']}>{headerContent}</div>
      </div>

      {/* Messages */}
      <ScrollArea className={styles['scrollArea']} ref={scrollAreaRef}>
        <div className={styles['messagesContainer']}>
          {messages.map(renderMessage)}
        </div>
      </ScrollArea>

      {/* Input */}
      <form onSubmit={handleSubmit} className={styles['inputContainer']}>
        <div className={styles['inputWrapper']}>
          <Input
            value={input}
            onChange={handleInputChange}
            placeholder={activeTopic ? `Ask about ${activeTopic.name.toLowerCase()}...` : 'Ask me anything about your infrastructure...'}
            className={styles['input']}
          />
          <Button type="submit" disabled={!input.trim() || status === 'submitted'}>
            <Send className={styles['sendIcon']} />
          </Button>
        </div>
      </form>
    </div>
  );
}

export default ChatInterface;
