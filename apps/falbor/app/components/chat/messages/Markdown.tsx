'use client';
import { memo, useMemo } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import type { BundledLanguage } from 'shiki';
import { createScopedLogger } from '~/utils/logger';
import { rehypePlugins, remarkPlugins, allowedHTMLElements } from '~/utils/markdown';
import { Artifact, openArtifactInWorkbench } from './Artifact';
import { CodeBlock } from './CodeBlock';
import type { Message } from 'ai';
import styles from './Markdown.module.scss';
import ThoughtBox from './ThoughtBox';
import FunctionCallBox from './FunctionCallBox';
import type { ProviderInfo } from '~/types/model';

const logger = createScopedLogger('MarkdownComponent');

function extractNodeText(node: any): string {
  if (!node?.children) {
    return '';
  }

  return node.children
    .map((child: any) => {
      if (child.type === 'text') {
        return child.value;
      }

      return extractNodeText(child);
    })
    .join('');
}

function getQuickActionIcon(type: string, label: string) {
  if (type === 'file') {
    return 'i-ph:file';
  }

  if (type === 'link') {
    return 'i-ph:link';
  }

  if (type === 'implement') {
    return 'i-ph:code';
  }

  const text = `${type} ${label}`.toLowerCase();
  const keywords: [RegExp, string][] = [
    [/(think|deep|reason|plan|ponder|reflect|analy)/, 'i-ph:brain'],
    [/(search|research|lookup|find|investigat|competitor)/, 'i-ph:magnifying-glass'],
    [/(scan|check|review|audit|verify|test|inspect)/, 'i-ph:scan'],
    [/(fix|bug|error|repair|resolve|issue|debug|correct)/, 'i-ph:wrench'],
    [/(design|style|ui|visual|theme|palette|aesthetic|look)/, 'i-ph:palette'],
    [/(generate|create|build|make|write)/, 'i-ph:sparkle'],
    [/(explain|learn|how|what|why|detail|understand)/, 'i-ph:chats'],
    [/(implement|code|develop|deploy)/, 'i-ph:code'],
  ];

  for (const [regex, icon] of keywords) {
    if (regex.test(text)) {
      return icon;
    }
  }

  return 'i-ph:lightning';
}

interface MarkdownProps {
  children: string;
  html?: boolean;
  limitedMarkdown?: boolean;
  append?: (message: Message) => void;
  chatMode?: 'discuss' | 'build' | 'troubleshoot' | 'idea' | 'mvp_research' | 'mvp_research';
  setChatMode?: (mode: 'discuss' | 'build' | 'troubleshoot' | 'idea' | 'mvp_research' | 'mvp_research') => void;
  model?: string;
  provider?: ProviderInfo;
  isCanvas?: boolean;
}

export const Markdown = memo(
  ({ children, html = false, limitedMarkdown = false, append, setChatMode, model, provider, isCanvas = false }: MarkdownProps) => {
    logger.trace('Render');

    const components = useMemo(() => {
      return {
        div: ({ className, children, node, ...props }) => {
          const dataProps = node?.properties as Record<string, unknown>;

          if (className?.includes('__falborArtifact__')) {
            if (isCanvas) {
              return null;
            }
            const messageId = node?.properties.dataMessageId as string;
            const artifactId = node?.properties.dataArtifactId as string;

            if (!messageId) {
              logger.error(`Invalid message id ${messageId}`);
            }

            if (!artifactId) {
              logger.error(`Invalid artifact id ${artifactId}`);
            }

            return <Artifact messageId={messageId} artifactId={artifactId} append={append} model={model} provider={provider?.name} />;
          }

          if (className?.includes('__falborSelectedElement__')) {
            const messageId = node?.properties.dataMessageId as string;
            const elementDataAttr = node?.properties.dataElement as string;


            let elementData: any = null;

            if (elementDataAttr) {
              try {
                elementData = JSON.parse(elementDataAttr);
              } catch (e) {
                console.error('Failed to parse element data:', e);
              }
            }

            if (!messageId) {
              logger.error(`Invalid message id ${messageId}`);
            }

            return (
              <div className="bg-falbor-elements-background-depth-3 border border-falbor-elements-borderColor rounded-lg p-3 my-2">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-mono bg-falbor-elements-background-depth-2 px-2 py-1 rounded text-falbor-elements-textTer">
                    {elementData?.tagName}
                  </span>
                  {elementData?.className && (
                    <span className="text-xs text-falbor-elements-textSecondary">.{elementData.className}</span>
                  )}
                </div>
                <code className="block text-sm !text-falbor-elements-textSecondary !bg-falbor-elements-background-depth-2 border border-falbor-elements-borderColor p-2 rounded">
                  {elementData?.displayText}
                </code>
              </div>
            );
          }

          if (className?.includes('__falborThought__')) {
            return <ThoughtBox title="Thought process">{children}</ThoughtBox>;
          }

          if (className?.includes('__falborPlan__')) {
            return <ThoughtBox title="Planning">{children}</ThoughtBox>;
          }

          if (className?.includes('__falborQuickAction__') || dataProps?.dataFalborQuickAction) {
            return <div className="flex items-center gap-2 flex-wrap mt-3.5">{children}</div>;
          }

          if (className?.includes('__falborFunctionCall__')) {
            const content = (dataProps['data-content'] || dataProps.dataContent) as string;
            return <FunctionCallBox>{decodeURIComponent(content || '')}</FunctionCallBox>;
          }

          return (
            <div className={className} {...props}>
              {children}
            </div>
          );
        },
        span: ({ className, children, node, ...props }) => {
          if (className?.includes('__falborConnector__')) {
            const dataProps = node?.properties as Record<string, unknown>;
            const id = (dataProps['data-id'] || dataProps.dataId) as string;
            return (
              <span className="bg-[#0099ff]/20 text-[#0099ff] rounded-[4px] px-1 font-medium mx-1">
                @{id}
              </span>
            );
          }
          if (className?.includes('__falborSkill__')) {
            const dataProps = node?.properties as Record<string, unknown>;
            const id = (dataProps['data-id'] || dataProps.dataId) as string;
            return (
              <span className="bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded-[4px] px-1 font-medium mx-1 flex-inline items-center gap-1">
                <i className="i-ph:magic-wand text-xs" /> {id}
              </span>
            );
          }
          return (
            <span className={className} {...props}>
              {children}
            </span>
          );
        },
        pre: (props) => {
          const { children, node, ...rest } = props;

          const [firstChild] = node?.children ?? [];

          if (
            firstChild &&
            firstChild.type === 'element' &&
            firstChild.tagName === 'code' &&
            firstChild.children[0].type === 'text'
          ) {
            const { className, ...rest } = firstChild.properties;
            const [, language = 'plaintext'] = /language-(\w+)/.exec(String(className) || '') ?? [];

            return <CodeBlock code={firstChild.children[0].value} language={language as any} {...rest} />;
          }

          return <pre {...rest}>{children}</pre>;
        },
        button: ({ node, children, ...props }) => {
          const dataProps = node?.properties as Record<string, unknown>;

          if (
            dataProps?.class?.toString().includes('__falborQuickAction__') ||
            dataProps?.dataFalborQuickAction === 'true'
          ) {
            const type = dataProps['data-type'] || dataProps.dataType;
            const message = dataProps['data-message'] || dataProps.dataMessage;
            const path = dataProps['data-path'] || dataProps.dataPath;
            const href = dataProps['data-href'] || dataProps.dataHref;

            const safeType = typeof type === 'string' ? type : '';
            const labelText = extractNodeText(node);
            const iconClass = getQuickActionIcon(safeType, labelText);

            return (
              <button
                className="rounded-md justify-center px-3 py-1.5 text-xs bg-falbor-elements-item-backgroundAccent text-falbor-elements-item-contentAccent opacity-90 hover:opacity-100 flex items-center gap-2 cursor-pointer"
                data-type={type}
                data-message={message}
                data-path={path}
                data-href={href}
                onClick={() => {
                  if (type === 'file') {
                    openArtifactInWorkbench(path);
                  } else if (type === 'message' && append) {
                    append({
                      id: `quick-action-message-${Date.now()}`,
                      content: [
                        {
                          type: 'text',
                          text: `[Model: ${model}]\n\n[Provider: ${provider?.name}]\n\n${message}`,
                        },
                      ] as any,
                      role: 'user',
                    });
                    console.log('Message appended:', message);
                  } else if (type === 'implement' && append && setChatMode) {
                    setChatMode('build');
                    append({
                      id: `quick-action-implement-${Date.now()}`,
                      content: [
                        {
                          type: 'text',
                          text: `[Model: ${model}]\n\n[Provider: ${provider?.name}]\n\n${message}`,
                        },
                      ] as any,
                      role: 'user',
                    });
                  } else if (type === 'link' && typeof href === 'string') {
                    try {
                      const url = new URL(href, window.location.origin);
                      window.open(url.toString(), '_blank', 'noopener,noreferrer');
                    } catch (error) {
                      console.error('Invalid URL:', href, error);
                    }
                  }
                }}
              >
                <div className={`text-lg ${iconClass}`} />
                {children}
              </button>
            );
          }

          return <button {...props}>{children}</button>;
        },
      } satisfies Components;
    }, []);

    return (
      <ReactMarkdown
        allowedElements={allowedHTMLElements}
        className={styles.MarkdownContent}
        components={components}
        remarkPlugins={remarkPlugins(limitedMarkdown)}
        rehypePlugins={rehypePlugins(html)}
      >
        {stripCodeFenceFromArtifact(children).replace(
          /(?:<|&lt;)function_calls(?:>|&gt;)([\s\S]*?)(?:<|&lt;)\/function_calls(?:>|&gt;)/gi,
          (match, p1) => {
            return `<div class="__falborFunctionCall__" data-content="${encodeURIComponent(p1)}"></div>`;
          }
        )}
      </ReactMarkdown>
    );
  },
);


export const stripCodeFenceFromArtifact = (content: string) => {
  if (!content || typeof content !== 'string') {
    return '';
  }

  if (!content.includes('__falborArtifact__')) {
    return content;
  }

  const lines = content.split('\n');
  const artifactLineIndex = lines.findIndex((line) => line.includes('__falborArtifact__'));


  if (artifactLineIndex === -1) {
    return content;
  }


  if (artifactLineIndex > 0 && lines[artifactLineIndex - 1]?.trim().match(/^```\w*$/)) {
    lines[artifactLineIndex - 1] = '';
  }

  if (artifactLineIndex < lines.length - 1 && lines[artifactLineIndex + 1]?.trim().match(/^```$/)) {
    lines[artifactLineIndex + 1] = '';
  }

  return lines.join('\n');
};
