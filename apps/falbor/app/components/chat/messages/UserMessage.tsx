'use client';

import { MODEL_REGEX, PROVIDER_REGEX } from '~/utils/constants';
import { Markdown } from './Markdown';
import { useStore } from '@nanostores/react';
import { profileStore } from '~/lib/stores/profile';
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cubicEasingFn } from '~/utils/easings';
import type {
  TextUIPart,
  ReasoningUIPart,
  ToolInvocationUIPart,
  SourceUIPart,
  FileUIPart,
  StepStartUIPart,
} from '@ai-sdk/ui-utils';

interface UserMessageProps {
  content: string | Array<{ type: string; text?: string; image?: string }>;
  parts:
  | (TextUIPart | ReasoningUIPart | ToolInvocationUIPart | SourceUIPart | FileUIPart | StepStartUIPart)[]
  | undefined;
}

export function UserMessage({ content, parts }: UserMessageProps) {
  const profile = useStore(profileStore);

  
  const images =
    parts?.filter(
      (part): part is FileUIPart => part.type === 'file' && 'mimeType' in part && part.mimeType.startsWith('image/'),
    ) || [];

  if (Array.isArray(content)) {
    const textItem = content.find((item) => item.type === 'text');
    let rawText = textItem?.text || '';
    const { skills, cleanContent } = parseSkills(rawText);
    const textContent = parseConnectors(stripMetadata(cleanContent));

    return (
      <div className="overflow-hidden flex flex-col gap-3 items-center ">
        {}
        <div className="flex flex-col gap-4 bg-[#EEEEEE] backdrop-blur-sm p-3 py-3 w-full overflow-hidden break-words rounded-lg">
          {textContent && <Markdown html>{textContent}</Markdown>}
          {images.map((item, index) => (
            <img
              key={index}
              src={`data:${item.mimeType};base64,${item.data}`}
              alt={`Image ${index + 1}`}
              className="max-w-full h-auto rounded-lg"
              style={{ maxHeight: '512px', objectFit: 'contain' }}
            />
          ))}
        </div>
      </div>
    );
  }

  const { skills, cleanContent } = parseSkills(content as string);
  const textContent = parseConnectors(stripMetadata(cleanContent));

  return (
    <div className="overflow-hidden flex flex-col gap-3 items-center w-full">
      <div className="flex flex-col bg-[#EEEEEE] dark:bg-[#252525] backdrop-blur-sm px-5 py-3.5 w-full rounded-lg overflow-hidden break-words">
        <div className="flex items-start gap-3">
          {profile?.avatar ? (
            <img
              src={profile.avatar}
              alt={profile?.username || "User"}
              className="w-[25px] h-[25px] object-cover rounded-full flex-shrink-0 mt-1"
              loading="eager"
              decoding="sync"
            />
          ) : (
            <div className="i-ph:user-fill text-accent-500 text-2xl flex-shrink-0" />
          )}

          <div className="flex-1 min-w-0">
            <Markdown html>{textContent}</Markdown>

            {images.length > 0 && (
              <div className="flex flex-col gap-4 mt-4">
                {images.map((item, index) => (
                  <img
                    key={index}
                    src={`data:${item.mimeType};base64,${item.data}`}
                    alt={`Image ${index + 1}`}
                    className="max-w-full h-auto rounded-lg"
                    style={{ maxHeight: "512px", objectFit: "contain" }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function stripMetadata(content: string) {
  const artifactRegex = /<falborArtifact\s+[^>]*>[\s\S]*?<\/falborArtifact>/gm;
  const dbContextRegex = /\n\n\[Requirement: Integrate (Neon|Supabase) database for storage\. Generate the code immediately\.\]/g;
  return content.replace(MODEL_REGEX, '').replace(PROVIDER_REGEX, '').replace(artifactRegex, '').replace(dbContextRegex, '');
}

function parseConnectors(content: string) {
  let result = content.replace(/@([a-zA-Z0-9_-]+)(?=\s|$)/g, (match, id) => {
    return `<span class="__falborConnector__" data-id="${id}"></span>`;
  });
  result = result.replace(/\[Skill:\s*([a-zA-Z0-9_-]+)\]/g, (match, id) => {
    return `<span class="__falborSkill__" data-id="${id}"></span>`;
  });
  return result;
}

function parseSkills(content: string) {
  const skills: { name: string, content: string }[] = [];
  let cleanContent = content;

  const startTag = '[ACTIVE SKILLS - The following instructions MUST be followed for this request]:\n';
  const endTag = '[END ACTIVE SKILLS]\n\n';

  const startIndex = content.indexOf(startTag);
  if (startIndex !== -1) {
    const endIndex = content.indexOf(endTag, startIndex);
    if (endIndex !== -1) {
      const skillsBlock = content.substring(startIndex + startTag.length, endIndex);

      const parts = skillsBlock.split('=== Skill: ');
      for (const part of parts) {
        if (!part.trim()) continue;
        const newlineIdx = part.indexOf(' ===\n');
        if (newlineIdx !== -1) {
          const name = part.substring(0, newlineIdx).trim();
          const content = part.substring(newlineIdx + 5).trim();
          if (name) {
            skills.push({ name, content });
          }
        }
      }

      cleanContent = content.substring(0, startIndex) + content.substring(endIndex + endTag.length);
    }
  }

  return { skills, cleanContent };
}

function SkillInvocations({ skills }: { skills: { name: string, content: string }[] }) {
  const [showDetails, setShowDetails] = useState(false);

  if (!skills || skills.length === 0) return null;

  return (
    <div className="skill-invocation border border-falbor-elements-borderColor flex flex-col overflow-hidden rounded-lg w-full transition-border duration-150 mb-3 bg-falbor-elements-background-depth-1">
      <div className="flex">
        <button
          className="flex items-stretch bg-falbor-elements-background-depth-2 hover:bg-falbor-elements-artifacts-backgroundHover w-full overflow-hidden"
          onClick={() => setShowDetails(!showDetails)}
        >
          <div className="p-2.5">
            <div className="i-ph:magic-wand text-xl text-accent-500 hover:text-accent-600 transition-colors"></div>
          </div>
          <div className="p-2.5 w-full text-left">
            <div className="w-full text-falbor-elements-textPrimary font-medium leading-5 text-sm">
              Using Skills
              <span className="w-full text-falbor-elements-textSecondary text-xs mt-0.5 block">
                ({skills.length} skill{skills.length > 1 ? 's' : ''} active)
              </span>
            </div>
          </div>
        </button>
        <AnimatePresence>
          <motion.button
            initial={{ width: 0 }}
            animate={{ width: 'auto' }}
            exit={{ width: 0 }}
            transition={{ duration: 0.15, ease: cubicEasingFn }}
            className="bg-falbor-elements-artifacts-background hover:bg-falbor-elements-artifacts-backgroundHover"
            onClick={() => setShowDetails(!showDetails)}
          >
            <div className="p-2">
              <div
                className={`${showDetails ? 'i-ph:caret-up-bold' : 'i-ph:caret-down-bold'} text-xl text-falbor-elements-textSecondary hover:text-falbor-elements-textPrimary transition-colors`}
              ></div>
            </div>
          </motion.button>
        </AnimatePresence>
      </div>
      <AnimatePresence>
        {showDetails && (
          <motion.div
            className="details"
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: '0px' }}
            transition={{ duration: 0.15 }}
          >
            <div className="bg-falbor-elements-artifacts-borderColor h-[1px]" />
            <div className="p-5 text-left bg-falbor-elements-actions-background">
              <ul className="list-none space-y-4">
                {skills.map((skill, index) => (
                  <motion.li
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, ease: cubicEasingFn }}
                  >
                    <div className="flex items-center gap-1.5 text-xs mb-2">
                      <div className="text-lg text-accent-500">
                        <div className="i-ph:check-circle"></div>
                      </div>
                      <div className="text-falbor-elements-textSecondary text-xs">Skill:</div>
                      <div className="text-falbor-elements-textPrimary font-semibold">{skill.name}</div>
                    </div>
                    <div className="ml-6 mb-2">
                      <div className="bg-[#FAFAFA] dark:bg-[#0A0A0A] p-3 rounded-md text-xs font-mono text-falbor-elements-textSecondary overflow-x-auto whitespace-pre-wrap">
                        {skill.content}
                      </div>
                    </div>
                  </motion.li>
                ))}
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
