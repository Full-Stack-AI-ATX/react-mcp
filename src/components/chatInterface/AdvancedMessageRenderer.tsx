'use client';

import type React from 'react';

import {
  Check, Copy, Database, Play,
}                             from 'lucide-react';
import { useState }           from 'react';

import Badge                  from '@Components/ui/badge';
import Button                 from '@Components/ui/button';
import { Card, CardContent }  from '@Components/ui/card';

import styles                 from './styles.module.css';


interface AdvancedMessageRendererProps {
  content: string;
  onExecuteQuery?: (query: string) => void;
}

export function AdvancedMessageRenderer({ content, onExecuteQuery }: AdvancedMessageRendererProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const parseContent = (text: string) => {
    const sections = [];
    const lines = text.split('\n');
    let currentSection: { type: 'text'; content: string[] } = { type: 'text', content: [] };
    let inCodeBlock = false;
    let codeBlockContent: string[] = [];
    let codeBlockLanguage = '';

    for (const line of lines) {
      if (line.startsWith('```')) {
        if (inCodeBlock) {
          sections.push({
            type: 'code',
            language: codeBlockLanguage,
            content: codeBlockContent.join('\n').trim(),
          });
          codeBlockContent = [];
          inCodeBlock = false;
        } else {
          if (currentSection.content.length > 0) {
            sections.push({
              type: 'text',
              content: currentSection.content.join('\n').trim(),
            });
          }
          currentSection = { type: 'text', content: [] };
          codeBlockLanguage = line.replace('```', '');
          inCodeBlock = true;
        }
      } else if (inCodeBlock) {
        codeBlockContent.push(line);
      } else {
        currentSection.content.push(line);
      }
    }

    if (currentSection.content.length > 0) {
      sections.push({
        type: 'text',
        content: currentSection.content.join('\n').trim(),
      });
    }

    if (codeBlockContent.length > 0) {
      sections.push({
        type: 'code',
        language: codeBlockLanguage,
        content: codeBlockContent.join('\n').trim(),
      });
    }

    return sections;
  };

  const copyToClipboard = async (text: string, index: number) => {
    await navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const renderTextContent = (text: string) => {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let listItems: string[] = [];
    let tableLines: string[] = [];
    let isParsingTable = false;

    const parseInline = (line: string): React.ReactNode[] => {
      // This regex splits the line by `**...**` or `...` patterns, keeping the delimiters.
      const parts = line.split(/(\*\*.*?\*\*|`.*?`)/g).filter(Boolean);
      return parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} className={styles.textStrong}>{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('`') && part.endsWith('`')) {
          return <code key={i} className={styles.textCode}>{part.slice(1, -1)}</code>;
        }
        return part;
      });
    };

    const flushList = () => {
      if (listItems.length > 0) {
        elements.push(
          <ul key={`ul-${elements.length}`} className={styles.textUl}>
            {listItems.map((item, i) => (
              <li key={i} className={styles.textLi}>{parseInline(item)}</li>
            ))}
          </ul>
        );
        listItems = [];
      }
    };

    const flushTable = () => {
      if (tableLines.length > 0) {
        const headerLine = tableLines[0];
        const separatorLine = tableLines[1];
        if (!headerLine || !separatorLine || !separatorLine.includes('---')) {
          tableLines.forEach((line, index) => {
            elements.push(<p key={`p-fallback-${elements.length}-${index}`} className={styles.textP}>{parseInline(line)}</p>);
          });
          tableLines = [];
          return;
        }

        const header = headerLine.split('|').map(cell => cell.trim()).filter(Boolean);
        const rows = tableLines.slice(2).map(rowLine => {
          return rowLine.split('|').map(cell => cell.trim()).filter(Boolean);
        }).filter(row => row.length > 0);

        if (header.length > 0) {
          elements.push(
            <div key={`table-container-${elements.length}`} className={styles.tableContainer}>
              <table key={`table-${elements.length}`} className={styles.table}>
                <thead>
                  <tr className={styles.tableTr}>
                    {header.map((h, i) => <th key={i} className={styles.tableTh}>{h}</th>)}
                  </tr>
                </thead>
                {rows.length > 0 && (
                  <tbody>
                    {rows.map((row, i) => (
                      <tr key={i} className={styles.tableTr}>
                        {row.map((cell, j) => <td key={j} className={styles.tableTd}>{parseInline(cell)}</td>)}
                      </tr>
                    ))}
                  </tbody>
                )}
              </table>
            </div>
          );
        }
        tableLines = [];
      }
    };

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith('|') && trimmedLine.endsWith('|')) {
        if (!isParsingTable) {
          flushList();
        }
        isParsingTable = true;
        tableLines.push(line);
        if (index === lines.length - 1) {
          flushTable();
          isParsingTable = false;
        }
        return;
      }

      if (isParsingTable) {
        flushTable();
        isParsingTable = false;
      }

      if (line.trim() === '') {
        flushList();
        return;
      }

      if (line.startsWith('## ')) {
        flushList();
        elements.push(<h2 key={index} className={styles.textH2}>{parseInline(line.substring(3))}</h2>);
        return;
      }

      if (line.startsWith('### ')) {
        flushList();
        elements.push(<h3 key={index} className={styles.textH3}>{parseInline(line.substring(4))}</h3>);
        return;
      }

      const keyValueMatch = line.match(/^- \*\*(.*?)\*\*:(.*)/);
      if (keyValueMatch) {
        flushList();
        elements.push(
          <p key={index} className={styles.textKeyValuePair}>
            <span className={styles.textKey}>{keyValueMatch[1]}:</span>
            <span className={styles.textValue}>
              {parseInline(keyValueMatch[2].trim())}
            </span>
          </p>
        );
        return;
      }

      if (line.trim().startsWith('- ')) {
        listItems.push(line.trim().substring(2));
      } else {
        flushList();
        elements.push(<p key={index} className={styles.textP}>{parseInline(line)}</p>);
      }
    });

    flushList();
    flushTable();

    return <>{elements}</>;
  };

  const sections = parseContent(content);

  return (
    <div className={styles.advancedRendererContainer}>
      {sections.map((section, index) => (
        <div key={index}>
          {section.type === 'text' ? (
            <div className={styles.textContent}>
              {renderTextContent(section.content)}
            </div>
          ) : (
            <Card className={styles.codeCard}>
              <CardContent className={styles.codeCardContent}>
                <div className={styles.codeHeader}>
                  <div className={styles.codeHeaderLeft}>
                    <Database className={styles.sqlIcon} />
                    <span className={styles.sqlTitle}>SQL Query</span>
                    {section.language && (
                      <Badge variant="secondary" className={styles.sqlBadge}>
                        {section.language.toUpperCase()}
                      </Badge>
                    )}
                  </div>
                  <div className={styles.codeHeaderRight}>
                    {onExecuteQuery && section.language && section.language.toLowerCase() === 'sql' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onExecuteQuery(section.content)}
                        className={styles.runButton}
                      >
                        <Play className={styles.runIcon} />
                        Run
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(section.content, index)}
                      className={styles.copyButton}
                    >
                      {copiedIndex === index ? (
                        <Check className={styles.copyIconSuccess} />
                      ) : (
                        <Copy className={styles.copyIcon} />
                      )}
                    </Button>
                  </div>
                </div>
                <div className={styles.codeBlockWrapper}>
                  <pre className={styles.codeBlock}>
                    <code>{section.content}</code>
                  </pre>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ))}
    </div>
  );
}

export default AdvancedMessageRenderer;
