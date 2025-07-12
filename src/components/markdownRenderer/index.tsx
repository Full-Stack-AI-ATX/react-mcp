'use client';

import React          from 'react';
import ReactMarkdown  from 'react-markdown';
import remarkGfm      from 'remark-gfm';

import CodeBlock      from '@Components/codeBlock';
import styles         from './styles.module.css';


interface MarkdownRendererProps {
  content: string;
}

const MarkdownRenderer = ({ content }: MarkdownRendererProps) => {
  const processedContent = content.replace(/\\n/g, '\n');

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        ul: ({ node, ...props }) => <ul className={styles.list} {...props} />,
        ol: ({ node, ...props }) => <ol className={styles.list} {...props} />,
        li: ({ node, ...props }) => <li className={styles.listItem} {...props} />,
        p: ({ node, children }) => {
          const hasCodeChild = node?.children.some(
            (child) => child.type === 'element' && child.tagName === 'code'
          );

          if (hasCodeChild) {
            return <div className={styles.paragraph}>{children}</div>;
          }
          return <p className={styles.paragraph}>{children}</p>;
        },
        code(props: any) {
          const { node, inline, className, children, ...rest } = props;

          if (inline) {
            return <code className={styles.inlineCode} {...rest}>{children}</code>;
          }

          const match = /language-(\w+)/.exec(className || '');
          const language = match ? match[1] : '';
          return (
            <CodeBlock
              language={language}
              value={String(children).replace(/\n$/, '')}
            />
          );
        },
      }}
    >
      {processedContent}
    </ReactMarkdown>
  );
};


export default MarkdownRenderer;
