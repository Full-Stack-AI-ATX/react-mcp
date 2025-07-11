'use client';

import type React                   from 'react';
import type { Topic }               from '@Types/workspace';
import type { Message }             from 'ai/react';

import {
  useId, useRef,
  useEffect, useState
}                                   from 'react';
import { Send, Bot, User, Trash2 }  from 'lucide-react';
import { useChat }                  from '@ai-sdk/react';

import Button                       from '@Components/ui/button';
import Textarea                     from '@Components/ui/textarea';
import ScrollArea                   from '@Components/ui/scrollArea';
import { Avatar, AvatarFallback }   from '@Components/ui/avatar';
import Badge                        from '@Components/ui/badge';
import AgentIntro                   from '@Components/agentIntro';
import MarkdownRenderer             from '@Components/markdownRenderer';
import UsageCounter                 from '@Components/usageCounter';

import styles                       from './styles.module.css';


interface ChatInterfaceProps {
  activeTopic: Topic
}

function ChatInterface({ activeTopic }: ChatInterfaceProps) {
  const randomId      = useId();
  const chatId        = activeTopic?.id ? `${activeTopic.id}-${randomId}` : `general-${randomId}`;
  const [isPriming, setIsPriming]     = useState(true);
  const [totalUsage, setTotalUsage]     = useState(0);
  const [currentUsage, setCurrentUsage] = useState(0);

  useEffect(() => {
    const primeChat = async () => {
      try {
        console.log('Priming chat with initial information...');
        const response = await fetch('/api/chat/prime');

        if (!response.ok) {
          throw new Error(`Priming request failed with status ${response.status}`);
        }

        console.log('Priming successful');
      } catch (error) {
        console.error('Failed to prime chat:', error);
      } finally {
        setIsPriming(false);
      }
    };
    primeChat();
  }, []);

  const { messages, input, handleInputChange, handleSubmit, setMessages, append, data, setData, status } = useChat({
    id: chatId,
    api: '/api/chat',
    initialInput: 'what are the columns in the speaker table',
    maxSteps: 5,
    onFinish: async (message, { usage }) => {
      console.log('useChat finished.', {
        message,
        usage
      });
      // Usage object contains token counts for the last interaction.
      // We are tracking the current call's usage and accumulating the total tokens used in this session.
      setCurrentUsage(usage.totalTokens);
      setTotalUsage(prevUsage => prevUsage + usage.totalTokens);
    },
    onError: (error) => {
      console.error('useChat error:', error);
    }
  });

  const chatStatus = isPriming ? 'priming' : status;

  const getBadgeVariant = () => {
    if (chatStatus === 'error') {
      return 'destructive';
    }
    if (chatStatus === 'ready') {
      return 'success';
    }
    return 'warning';
  };

  const viewportRef = useRef<HTMLDivElement>(null);
  const formRef     = useRef<HTMLFormElement>(null);
  const hasMessages = messages.length > 0;

  useEffect(() => {
    if (viewportRef.current) {
      viewportRef.current.scrollTop = viewportRef.current.scrollHeight;
    }
  }, [messages, data]);

  const clearHistory = () => {
    setMessages([]);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (input.trim() && formRef.current) {
        formRef.current.requestSubmit();
      }
    }
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
          <Badge variant={getBadgeVariant()} className={styles['badge']}>
            {chatStatus}
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
          <Badge variant={getBadgeVariant()} className={styles['badge']}>
            {chatStatus}
          </Badge>
        </>
      )}
      <UsageCounter
        currentUsage={currentUsage}
        totalUsage={totalUsage}
        className={styles.usageCounter}
      />
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
          <form
            ref={formRef}
            className={styles['inputContainer']}
            onSubmit={(e) => {
              setData(undefined);
              handleSubmit(e);
            }}
          >
            <div className={styles['inputWrapper']}>
              <Textarea
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={
                  activeTopic
                    ? `Ask about ${activeTopic.name.toLowerCase()}...`
                    : 'Ask me anything about your infrastructure...'
                }
                className={styles['input']}
              />
              <Button type="submit" disabled={isPriming || !input.trim() || status === 'submitted'}>
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
      <ScrollArea className={styles['scrollArea']} viewportRef={viewportRef}>
        <div className={styles['messagesContainer']}>
          {messages.map(renderMessage)}
        </div>
      </ScrollArea>

      {/* Input */}
      <form
        ref={formRef}
        className={styles['inputContainer']}
        onSubmit={(e) => {
          setData(undefined);
          handleSubmit(e);
        }}
      >
        <div className={styles['inputWrapper']}>
          <Textarea
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={activeTopic ? `Ask about ${activeTopic.name.toLowerCase()}...` : 'Ask me anything about your infrastructure...'}
            className={styles['input']}
          />
          <Button type="submit" disabled={isPriming || !input.trim() || status === 'submitted'}>
            <Send className={styles['sendIcon']} />
          </Button>
        </div>
      </form>
    </div>
  );
}


export default ChatInterface;
