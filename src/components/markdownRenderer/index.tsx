'use client';

import React          from 'react';
import ReactMarkdown  from 'react-markdown';
import remarkGfm      from 'remark-gfm';

import CodeBlock      from '@Components/codeBlock';


interface MarkdownRendererProps {
  content: string;
}

const MarkdownRenderer = ({ content }: MarkdownRendererProps) => {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code(props: any) {
          const { node, inline, className, children, ...rest } = props;

          if (inline) {
            return <code className={className} {...rest}>{children}</code>;
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
      {content}
    </ReactMarkdown>
  );
};


export default MarkdownRenderer;
