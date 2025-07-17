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
import AdvancedMessageRenderer      from './AdvancedMessageRenderer';
import UsageCounter                 from '@Components/usageCounter';

import styles                       from './styles.module.css';


interface ChatInterfaceProps {
  activeTopic: Topic | null;
}

function ChatInterface({ activeTopic }: ChatInterfaceProps) {
  const randomId                        = useId();
  const chatId                          = activeTopic?.id ? `${activeTopic.id}-${randomId}` : `general-${randomId}`;
  const [isPriming, setIsPriming]       = useState(true);
  const [totalUsage, setTotalUsage]     = useState(0);
  const [currentUsage, setCurrentUsage] = useState(0);
  const viewportRef                     = useRef<HTMLDivElement>(null);
  const formRef                         = useRef<HTMLFormElement>(null);
  // AIDEV-NOTE: Auto-scroll control system using multiple refs to manage scroll behavior:
  // - shouldAutoScrollRef: Controls whether auto-scroll is active (disabled when user scrolls up)
  // - lastMessageIdRef: Tracks message IDs to distinguish new messages from streaming updates
  // - justSubmittedRef: Forces scroll to bottom when user submits (regardless of current position)
  // - lastAutoScrollTimeRef: Throttles streaming auto-scroll to prevent conflict with user actions
  const shouldAutoScrollRef             = useRef(true);
  const lastMessageIdRef                = useRef<string>('');
  const justSubmittedRef                = useRef(false);
  const lastAutoScrollTimeRef           = useRef(0);

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
    initialInput: 'what database are you connected to?',
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

  const hasMessages = messages.length > 0;

  // AIDEV-NOTE: Smart auto-scroll system that handles both new messages and streaming updates.
  // Key behaviors:
  // 1. New message (different ID): Force scroll if user just submitted, or auto-scroll for assistant
  // 2. Streaming update (same ID): Throttled auto-scroll only if user hasn't scrolled up
  // 3. Respects user control: No auto-scroll when shouldAutoScrollRef is false
  useEffect(() => {
    const viewport = viewportRef.current;
    const lastMessage = messages[messages.length - 1];
    const lastMessageId = lastMessage?.id || '';

    if (!viewport) return;

    // Handle new message (different message ID)
    if (lastMessageId && lastMessageId !== lastMessageIdRef.current) {
      lastMessageIdRef.current = lastMessageId;

      // Force scroll and re-enable auto-scroll when user submits
      if (justSubmittedRef.current) {
        shouldAutoScrollRef.current = true;
        viewport.scrollTop = viewport.scrollHeight;
        justSubmittedRef.current = false;
      }
      // Auto-scroll for new assistant messages (if enabled)
      else if (lastMessage?.role === 'assistant' && shouldAutoScrollRef.current) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
    // Handle streaming updates (same message ID, growing content)
    else if (lastMessage && shouldAutoScrollRef.current) {
      const now = Date.now();
      const timeSinceLastScroll = now - lastAutoScrollTimeRef.current;

      // Throttle auto-scroll to prevent interference with user scroll events
      if (timeSinceLastScroll < 100) return;

      // Defer scroll to give user events priority
      setTimeout(() => {
        if (shouldAutoScrollRef.current && viewport) {
          viewport.scrollTop = viewport.scrollHeight;
          lastAutoScrollTimeRef.current = Date.now();
        }
      }, 50);
    }
  }, [messages]);

  // AIDEV-NOTE: Auto-scroll for data updates (tool results, metadata) when no new messages
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || !shouldAutoScrollRef.current || !data) return;

    viewport.scrollTop = viewport.scrollHeight;
  }, [data]);

  // AIDEV-NOTE: User scroll detection system with multi-layered event handling.
  // Only runs when messages exist (ScrollArea is rendered). Handles both intent and position:
  // - Scroll events: Update shouldAutoScrollRef based on position (bottom = true, up = false)
  // - Wheel/touch events: Immediately disable auto-scroll when user shows scroll intent
  // - Retry mechanism: Handles timing issues where viewport isn't ready on first attempt
  useEffect(() => {
    if (!hasMessages) return;

    const setupListeners = () => {
      const viewport = viewportRef.current;
      if (!viewport) return null;

      const handleScroll = () => {
        const isAtBottom = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < 5;
        shouldAutoScrollRef.current = isAtBottom;
      };

      const handleUserScrollIntent = () => {
        // Immediately disable auto-scroll when user initiates any scroll gesture
        if (shouldAutoScrollRef.current) {
          shouldAutoScrollRef.current = false;
        }
      };

      viewport.addEventListener('scroll', handleScroll, { passive: true });
      viewport.addEventListener('wheel', handleUserScrollIntent, { passive: true });
      viewport.addEventListener('touchstart', handleUserScrollIntent, { passive: true });
      viewport.addEventListener('touchmove', handleUserScrollIntent, { passive: true });

      return () => {
        viewport.removeEventListener('scroll', handleScroll);
        viewport.removeEventListener('wheel', handleUserScrollIntent);
        viewport.removeEventListener('touchstart', handleUserScrollIntent);
        viewport.removeEventListener('touchmove', handleUserScrollIntent);
      };
    };

    // Try immediate setup, fallback to retry if viewport not ready
    let cleanup = setupListeners();
    if (cleanup) return cleanup;

    const retryTimeout = setTimeout(() => {
      cleanup = setupListeners();
    }, 100);

    return () => {
      clearTimeout(retryTimeout);
      if (cleanup) cleanup();
    };
  }, [hasMessages]);

  // AIDEV-NOTE: Reset all chat state and scroll control refs
  const clearHistory = () => {
    setMessages([]);
    lastMessageIdRef.current = '';
    shouldAutoScrollRef.current = true;
    justSubmittedRef.current = false;
  };

  const handleExecuteQuery = async (sql: string) => {
    await append({
      role: 'user',
      content: `Run this query\n${sql}`,
      data: {
        hidden: true,
      },
    });
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (input.trim() && formRef.current) {
        formRef.current.requestSubmit();
      }
    }
  };

  const renderMessage = (message: Message) => {
    const senderName = message.role === 'user'
      ? 'You'
      : (activeTopic?.name
        ? `${activeTopic.name} Assistant`
        : 'General Agent Assistant');

    return (
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
        <div className={styles.messageWrapper}>
          <div className={styles.messageHeader}>
            <span className={styles.senderName}>{senderName}</span>
            {message.createdAt && (
              <span className={styles.timestamp}>
                {' • '}
                {message.createdAt.toLocaleTimeString()}
              </span>
            )}
          </div>
          <div
            className={`${styles.messageContent} ${
              message.role === 'user' ? styles.userMessage : styles.assistantMessage
            }`}
          >
            {message.role === 'user' ? (
              <p className={styles.messageText}>{message.content}</p>
            ) : (
              <AdvancedMessageRenderer
                content={message.content}
                onExecuteQuery={handleExecuteQuery}
              />
            )}
          </div>
        </div>
      </div>
    );
  };

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
              // AIDEV-NOTE: When the user submits a new prompt, mark that we just submitted
              // so the next message effect will force scroll to bottom
              justSubmittedRef.current = true;
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
          {messages.filter(m => !(m as any).data?.hidden).map(renderMessage)}
        </div>
      </ScrollArea>

      {/* Input */}
      <form
        ref={formRef}
        className={styles['inputContainer']}
        onSubmit={(e) => {
          // AIDEV-NOTE: When the user submits a new prompt, mark that we just submitted
          // so the next message effect will force scroll to bottom
          justSubmittedRef.current = true;
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
