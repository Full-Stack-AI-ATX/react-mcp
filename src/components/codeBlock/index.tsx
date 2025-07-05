'use client';

import 'highlight.js/styles/github-dark.css';

import { useState }     from 'react';
import { Copy, Check }  from 'lucide-react';
import hljs             from 'highlight.js';
import styles           from './styles.module.css';


interface CodeBlockProps {
  language: string;
  value: string;
}

const CodeBlock = ({ language, value }: CodeBlockProps) => {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 5000);
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
    <div className={styles['container']}>
      <div className={styles['header']}>
        <span className={styles['language']}>{language || 'plaintext'}</span>
        <button
          onClick={handleCopy}
          className={styles['copyButton']}
        >
          {isCopied
            ? (<><Check size={16} /> Copied!</>)
            : (<><Copy size={16} /> Copy code</>)
          }
        </button>
      </div>
      <pre className={styles['pre']}>
        <code
          className={`hljs language-${language || 'plaintext'}`}
          dangerouslySetInnerHTML={{ __html: getHighlightedCode() }}
        />
      </pre>
    </div>
  );
};


export default CodeBlock;
