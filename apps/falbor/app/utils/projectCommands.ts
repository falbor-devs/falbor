import type { Message } from 'ai';
import { generateId } from './fileUtils';

export interface ProjectCommands {
  type: string;
  setupCommand?: string;
  startCommand?: string;
  followupMessage: string;
}

interface FileContent {
  content: string;
  path: string;
}
function makeNonInteractive(command: string): string {
  const envVars = 'export CI=true DEBIAN_FRONTEND=noninteractive FORCE_COLOR=0';
  const interactivePackages = [
    { pattern: /npx\s+([^@\s]+@?[^\s]*)\s+init/g, replacement: 'echo "y" | npx --yes $1 init --defaults --yes' },
    { pattern: /npx\s+create-([^\s]+)/g, replacement: 'npx --yes create-$1 --template default' },
    { pattern: /npx\s+([^@\s]+@?[^\s]*)\s+add/g, replacement: 'npx --yes $1 add --defaults --yes' },
    { pattern: /npm\s+install(?!\s+--)/g, replacement: 'npm install --yes --no-audit --no-fund --silent' },
    { pattern: /yarn\s+add(?!\s+--)/g, replacement: 'yarn add --non-interactive' },
    { pattern: /pnpm\s+add(?!\s+--)/g, replacement: 'pnpm add --yes' },
  ];
  let processedCommand = command;
  interactivePackages.forEach(({ pattern, replacement }) => {
    processedCommand = processedCommand.replace(pattern, replacement);
  });

  return `${envVars} && ${processedCommand}`;
}

export async function detectProjectCommands(files: FileContent[]): Promise<ProjectCommands> {
  const hasFile = (name: string) => files.some((f) => f.path.endsWith(name));
  const hasFileContent = (name: string, content: string) =>
    files.some((f) => f.path.endsWith(name) && f.content.includes(content));

  if (hasFile('package.json')) {
    const packageJsonFile = files.find((f) => f.path.endsWith('package.json'));

    if (!packageJsonFile) {
      return { type: '', setupCommand: '', followupMessage: '' };
    }

    try {
      const packageJson = JSON.parse(packageJsonFile.content);
      const scripts = packageJson?.scripts || {};
      const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
      const isShadcnProject =
        hasFileContent('components.json', 'shadcn') ||
        Object.keys(dependencies).some((dep) => dep.includes('shadcn')) ||
        hasFile('components.json');
      const preferredCommands = ['dev', 'start', 'preview'];
      const availableCommand = preferredCommands.find((cmd) => scripts[cmd]);
      let baseSetupCommand = 'npx update-browserslist-db@latest && npm install';
      if (isShadcnProject) {
        baseSetupCommand += ' && npx shadcn@latest init';
      }

      const setupCommand = makeNonInteractive(baseSetupCommand);

      if (availableCommand) {
        return {
          type: 'Node.js',
          setupCommand,
          startCommand: `npm run ${availableCommand}`,
          followupMessage: `Found "${availableCommand}" script in package.json. Running "npm run ${availableCommand}" after installation.`,
        };
      }

      return {
        type: 'Node.js',
        setupCommand,
        followupMessage:
          'Would you like me to inspect package.json to determine the available scripts for running this project?',
      };
    } catch (error) {
      console.error('Error parsing package.json:', error);
      return { type: '', setupCommand: '', followupMessage: '' };
    }
  }

  if (hasFile('index.html')) {
    return {
      type: 'Static',
      startCommand: 'npx --yes serve',
      followupMessage: '',
    };
  }

  return { type: '', setupCommand: '', followupMessage: '' };
}

export function createCommandsMessage(commands: ProjectCommands): Message | null {
  if (!commands.setupCommand && !commands.startCommand) {
    return null;
  }

  let commandString = '';

  if (commands.setupCommand) {
    commandString += `
<falborAction type="shell">${commands.setupCommand}</falborAction>`;
  }

  if (commands.startCommand) {
    commandString += `
<falborAction type="start">${commands.startCommand}</falborAction>
`;
  }

  return {
    role: 'assistant',
    content: `
${commands.followupMessage ? `\n\n${commands.followupMessage}` : ''}
<falborArtifact id="project-setup" title="Project Setup">
${commandString}
</falborArtifact>`,
    id: generateId(),
    createdAt: new Date(),
  };
}

export function escapeFalborArtifactTags(input: string) {
  const regex = /(<falborArtifact[^>]*>)([\s\S]*?)(<\/falborArtifact>)/g;
  return input.replace(regex, (match, openTag, content, closeTag) => {
    const escapedOpenTag = openTag.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const escapedCloseTag = closeTag.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return `${escapedOpenTag}${content}${escapedCloseTag}`;
  });
}

export function escapeFalborAActionTags(input: string) {
  const regex = /(<falborAction[^>]*>)([\s\S]*?)(<\/falborAction>)/g;
  return input.replace(regex, (match, openTag, content, closeTag) => {
    const escapedOpenTag = openTag.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const escapedCloseTag = closeTag.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return `${escapedOpenTag}${content}${escapedCloseTag}`;
  });
}

export function escapeFalborTags(input: string) {
  return escapeFalborArtifactTags(escapeFalborAActionTags(input));
}
export function createCommandActionsString(commands: ProjectCommands): string {
  if (!commands.setupCommand && !commands.startCommand) {
    return '';
  }

  let commandString = '';

  if (commands.setupCommand) {
    commandString += `
<falborAction type="shell">${commands.setupCommand}</falborAction>`;
  }

  if (commands.startCommand) {
    commandString += `
<falborAction type="start">${commands.startCommand}</falborAction>
`;
  }

  return commandString;
}
