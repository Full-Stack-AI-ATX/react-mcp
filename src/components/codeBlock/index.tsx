'use client';

import 'highlight.js/styles/github-dark.css';

import { useState } from 'react';
import {
  Copy,
  Check,
  Database,
  Play,
}                   from 'lucide-react';
import hljs         from 'highlight.js';

import Badge        from '@Components/ui/badge';
import styles       from './styles.module.css';


interface CodeBlockProps {
  language: string;
  value: string;
}

const CodeBlock = ({ language, value }: CodeBlockProps) => {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const getHighlightedCode = () => {
    try {
      if (language && hljs.getLanguage(language)) {
        return hljs.highlight(value, { language }).value;
      }
      return hljs.highlightAuto(value).value;
    } catch (error) {
      return value;
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.title}>
          {language === 'sql' && <Database size={16} />}
          <span>{language === 'sql' ? 'SQL Query' : 'Code'}</span>
          <Badge variant="secondary" className={styles.languageBadge}>
            {language || 'plaintext'}
          </Badge>
        </div>
        <div className={styles.actions}>
          {language === 'sql' && (
            <button className={styles.runButton}>
              <Play size={16} />
              <span>Run</span>
            </button>
          )}
          <button onClick={handleCopy} className={styles.copyButton}>
            {isCopied ? (
              <>
                <Check size={16} />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy size={16} />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>
      <pre className={styles.pre}>
        <code
          className={`hljs language-${language || 'plaintext'}`}
          dangerouslySetInnerHTML={{ __html: getHighlightedCode() }}
        />
      </pre>
    </div>
  );
};


export default CodeBlock;
