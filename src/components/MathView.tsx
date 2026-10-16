import React, { useMemo } from 'react';
import katex from 'katex';

interface MathViewProps {
  content: string;
  className?: string;
}

export const MathView: React.FC<MathViewProps> = ({ content, className = '' }) => {
  const parts = useMemo(() => {
    if (!content) return [];

    // Split by $$ ... $$ or $ ... $
    const tokens: Array<{ type: 'text' | 'inline-math' | 'block-math'; value: string }> = [];
    const regex = /(\$\$[\s\S]*?\$\$|\$[^\$\n]+?\$)/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        tokens.push({
          type: 'text',
          value: content.slice(lastIndex, match.index),
        });
      }

      const raw = match[0];
      if (raw.startsWith('$$') && raw.endsWith('$$')) {
        tokens.push({
          type: 'block-math',
          value: raw.slice(2, -2).trim(),
        });
      } else if (raw.startsWith('$') && raw.endsWith('$')) {
        tokens.push({
          type: 'inline-math',
          value: raw.slice(1, -1).trim(),
        });
      }

      lastIndex = regex.lastIndex;
    }

    if (lastIndex < content.length) {
      tokens.push({
        type: 'text',
        value: content.slice(lastIndex),
      });
    }

    return tokens;
  }, [content]);

  return (
    <div className={`leading-relaxed ${className}`}>
      {parts.map((part, index) => {
        if (part.type === 'inline-math') {
          try {
            const html = katex.renderToString(part.value, {
              throwOnError: false,
              displayMode: false,
            });
            return (
              <span
                key={index}
                className="inline-math px-1 py-0.5 rounded bg-stone-800/40 text-amber-200"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            );
          } catch {
            return <code key={index} className="text-amber-300 font-mono">${part.value}$</code>;
          }
        }

        if (part.type === 'block-math') {
          try {
            const html = katex.renderToString(part.value, {
              throwOnError: false,
              displayMode: true,
            });
            return (
              <div
                key={index}
                className="my-2 p-2 bg-stone-900/80 border border-stone-800 rounded-lg overflow-x-auto text-amber-100 shadow-inner"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            );
          } catch {
            return (
              <pre key={index} className="p-2 bg-stone-900 rounded font-mono text-amber-300 overflow-x-auto">
                {part.value}
              </pre>
            );
          }
        }

        // Render text with line breaks preserved
        return (
          <span key={index} className="whitespace-pre-wrap">
            {part.value}
          </span>
        );
      })}
    </div>
  );
};
