import { createScopedLogger } from '~/utils/logger';
import { StreamingMessageParser, type StreamingMessageParserOptions } from './message-parser';

const logger = createScopedLogger('EnhancedMessageParser');

/**
 * Enhanced message parser that detects code blocks and file patterns
 * even when AI models don't wrap them in proper artifact tags.
 * Fixes issue #1797 where code outputs to chat instead of files.
 */
export class EnhancedStreamingMessageParser extends StreamingMessageParser {
  private _processedCodeBlocks = new Map<string, Map<string, string>>();
  private _artifactCounter = 0;

  // Optimized command pattern lookup
  private _commandPatternMap = new Map<string, RegExp>([
    ['npm', /^(npm|yarn|pnpm)\s+(install|run|start|build|dev|test|init|create|add|remove)/],
    ['git', /^(git)\s+(add|commit|push|pull|clone|status|checkout|branch|merge|rebase|init|remote|fetch|log)/],
    ['docker', /^(docker|docker-compose)\s+/],
    ['build', /^(make|cmake|gradle|mvn|cargo|go)\s+/],
    ['network', /^(curl|wget|ping|ssh|scp|rsync)\s+/],
    ['webcontainer', /^(cat|chmod|cp|echo|hostname|kill|ln|ls|mkdir|mv|ps|pwd|rm|rmdir|xxd)\s*/],
    ['webcontainer-extended', /^(alias|cd|clear|env|false|getconf|head|sort|tail|touch|true|uptime|which)\s*/],
    ['interpreters', /^(node|python|python3|java|go|rust|ruby|php|perl)\s+/],
    ['text-processing', /^(grep|sed|awk|cut|tr|sort|uniq|wc|diff)\s+/],
    ['archive', /^(tar|zip|unzip|gzip|gunzip)\s+/],
    ['process', /^(ps|top|htop|kill|killall|jobs|nohup)\s*/],
    ['system', /^(df|du|free|uname|whoami|id|groups|date|uptime)\s*/],
  ]);

  public wasReset = false;

  constructor(options: StreamingMessageParserOptions = {}) {
    super(options);
  }

  parse(messageId: string, input: string): string {
    this.wasReset = false;
    input = input || '';

    // Auto-rescue orphan falborAction tags that the AI forgot to wrap in falborArtifact
    if (input.includes('<falborAction') && !input.includes('<falborArtifact')) {
      const firstActionIndex = input.indexOf('<falborAction');
      if (firstActionIndex !== -1) {
        input = input.substring(0, firstActionIndex) + 
                `<falborArtifact id="auto-rescue-${messageId}" title="Generated Action" type="bundled">\n` + 
                input.substring(firstActionIndex);
      }
      if (input.includes('</falborAction>') && !input.includes('</falborArtifact>')) {
        const lastActionCloseIndex = input.lastIndexOf('</falborAction>');
        if (lastActionCloseIndex !== -1) {
          const insertPos = lastActionCloseIndex + '</falborAction>'.length;
          input = input.substring(0, insertPos) + '\n</falborArtifact>' + input.substring(insertPos);
        }
      }
    }

    // If no explicit artifacts in the raw input, check if we should auto-wrap code blocks
    if (!this._hasDetectedArtifacts(input)) {
      const enhancedInput = this._detectAndWrapCodeBlocks(messageId, input);
      return super.parse(messageId, enhancedInput);
    }

    // Artifacts ARE present — but the AI may ALSO have leaked raw code blocks
    // outside the artifact sections as "explanation" text. Strip those out so
    // they don't pollute the chat message with duplicate file content.
    input = this._stripLeakedCodeBlocksOutsideArtifacts(input);

    return super.parse(messageId, input);
  }

  /**
   * When a response contains proper <falborArtifact> blocks, the AI sometimes
   * also writes the file contents as plain code blocks in the text before the
   * artifact. This method removes those leaked blocks from the non-artifact
   * portions of the text, keeping only the artifact sections intact.
   */
  private _stripLeakedCodeBlocksOutsideArtifacts(input: string): string {
    const ARTIFACT_OPEN = '<falborArtifact';
    const ARTIFACT_CLOSE = '</falborArtifact>';

    let result = '';
    let pos = 0;

    while (pos < input.length) {
      const nextArtifact = input.indexOf(ARTIFACT_OPEN, pos);

      if (nextArtifact === -1) {
        // No more artifacts — clean code blocks from trailing text
        result += this._removeLeakedCodeBlocks(input.substring(pos));
        break;
      }

      // Clean code blocks from the text before this artifact
      result += this._removeLeakedCodeBlocks(input.substring(pos, nextArtifact));

      // Find end of this artifact
      const artifactEnd = input.indexOf(ARTIFACT_CLOSE, nextArtifact);

      if (artifactEnd === -1) {
        // Unclosed artifact — include everything else as-is
        result += input.substring(nextArtifact);
        break;
      }

      // Include the artifact block unchanged
      result += input.substring(nextArtifact, artifactEnd + ARTIFACT_CLOSE.length);
      pos = artifactEnd + ARTIFACT_CLOSE.length;
    }

    return result;
  }

  /**
   * Remove large code blocks from plain text that already has artifact coverage.
   * Short inline code snippets (< 8 lines) are kept since they may be examples.
   */
  private _removeLeakedCodeBlocks(text: string): string {
    return text.replace(/```[\w]*\n([\s\S]*?)```/g, (_match, content: string) => {
      const lines = content.split('\n').length;
      // Keep short snippets (< 8 lines) — they're likely inline examples, not full files
      return lines >= 8 ? '' : _match;
    });
  }

  private _hasDetectedArtifacts(input: string): boolean {
    return input.includes('<falborArtifact') || input.includes('</falborArtifact>');
  }

  private _detectAndWrapCodeBlocks(messageId: string, input: string): string {
    // Initialize processed blocks for this message if not exists
    if (!this._processedCodeBlocks.has(messageId)) {
      this._processedCodeBlocks.set(messageId, new Map<string, string>());
    }

    const processed = this._processedCodeBlocks.get(messageId)!;

    let enhanced = input;

    // First, detect and handle shell commands separately
    enhanced = this._detectAndWrapShellCommands(messageId, enhanced, processed);

    // Optimized regex patterns with better performance
    const patterns = [
      // Pattern 1: File path followed by code block (most common, check first)
      {
        regex: /(?:^|\n)([\/\w\-\.]+\.\w+):?\s*\n+```(\w*)\n([\s\S]*?)```/gim,
        type: 'file_path',
      },

      // Pattern 2: Explicit file creation mentions
      {
        regex:
          /(?:create|update|modify|edit|write|add|generate|here'?s?|file:?)\s+(?:a\s+)?(?:new\s+)?(?:file\s+)?(?:called\s+)?[`'"]*([\/\w\-\.]+\.\w+)[`'"]*:?\s*\n+```(\w*)\n([\s\S]*?)```/gi,
        type: 'explicit_create',
      },

      // Pattern 3: Code blocks with filename comments
      {
        regex: /```(\w*)\n(?:\/\/|#|<!--)\s*(?:file:?|filename:?)\s*([\/\w\-\.]+\.\w+).*?\n([\s\S]*?)```/gi,
        type: 'comment_filename',
      },

      // Pattern 4: Code block with "in <filename>" context
      {
        regex: /(?:in|for|update)\s+[`'"]*([\/\w\-\.]+\.\w+)[`'"]*:?\s*\n+```(\w*)\n([\s\S]*?)```/gi,
        type: 'in_filename',
      },

      // Pattern 5: Structured files (package.json, components)
      {
        regex:
          /```(?:json|jsx?|tsx?|html?|vue|svelte)\n(\{[\s\S]*?"(?:name|version|scripts|dependencies|devDependencies)"[\s\S]*?\}|<\w+[^>]*>[\s\S]*?<\/\w+>[\s\S]*?)```/gi,
        type: 'structured_file',
      },
    ];

    // Process each pattern in order of likelihood
    for (const pattern of patterns) {
      enhanced = enhanced.replace(pattern.regex, (match, ...args) => {
        // Skip if already processed
        const blockHash = this._hashBlock(match);

        if (processed.has(blockHash)) {
          return processed.get(blockHash)!;
        }

        let filePath: string;
        let language: string;
        let content: string;

        // Extract based on pattern type
        if (pattern.type === 'comment_filename') {
          [language, filePath, content] = args;
        } else if (pattern.type === 'structured_file') {
          content = args[0];
          language = pattern.regex.source.includes('json') ? 'json' : 'jsx';
          filePath = this._inferFileNameFromContent(content, language);
        } else {
          // file_path, explicit_create, in_filename patterns
          [filePath, language, content] = args;
        }

        // Check if this should be treated as a shell command instead of a file
        if (this._isShellCommand(content, language)) {
          logger.debug(`Auto-wrapped code block as shell command instead of file`);
          const wrapped = this._wrapInShellAction(content, messageId);
          processed.set(blockHash, wrapped);
          return wrapped;
        }

        // Clean up the file path
        filePath = this._normalizeFilePath(filePath);

        // Validate file path
        if (!this._isValidFilePath(filePath)) {
          return match; // Return original if invalid
        }

        // Check if there's proper context for file creation
        if (!this._hasFileContext(enhanced, match)) {
          // If no clear file context, skip unless it's an explicit file pattern
          const isExplicitFilePattern =
            pattern.type === 'explicit_create' || pattern.type === 'comment_filename' || pattern.type === 'file_path';

          if (!isExplicitFilePattern) {
            return match; // Return original if no context
          }
        }

        // Generate artifact wrapper
        const artifactId = `artifact-${messageId}-${this._artifactCounter++}`;
        const wrapped = this._wrapInArtifact(artifactId, filePath, content);

        logger.debug(`Auto-wrapped code block as file: ${filePath}`);

        // Mark as processed and store the generated wrapper
        processed.set(blockHash, wrapped);

        return wrapped;
      });
    }

    // Also detect standalone file operations without code blocks
    const fileOperationPattern =
      /(?:create|write|save|generate)\s+(?:a\s+)?(?:new\s+)?file\s+(?:at\s+)?[`'"]*([\\/\w\-\.]+\.\w+)[`'"]*\s+with\s+(?:the\s+)?(?:following\s+)?content:?\s*\n([\s\S]+?)(?=\n\n|\n(?:create|write|save|generate|now|next|then|finally)|$)/gi;

    enhanced = enhanced.replace(fileOperationPattern, (match, filePath, content) => {
      const blockHash = this._hashBlock(match);

      if (processed.has(blockHash)) {
        return processed.get(blockHash)!;
      }

      filePath = this._normalizeFilePath(filePath);

      if (!this._isValidFilePath(filePath)) {
        return match;
      }

      const artifactId = `artifact-${messageId}-${this._artifactCounter++}`;

      // Clean content - remove leading/trailing whitespace but preserve indentation
      content = content.trim();

      const wrapped = this._wrapInArtifact(artifactId, filePath, content);
      logger.debug(`Auto-wrapped file operation: ${filePath}`);

      processed.set(blockHash, wrapped);
      return wrapped;
    });

    // LAST RESORT: Catch any remaining code blocks with substantial code content
    // This handles smaller models (DeepSeek Chat, GPT-4o Mini) that ignore XML format instructions
    // and just dump raw markdown code blocks into the chat.
    const lastResortCodeBlockPattern = /```(jsx?|tsx?|typescript|javascript|html?|css|python|py|json|vue|svelte|php|ruby|go|rust|java|kotlin|swift|c|cpp|csharp)\n([\s\S]{10,}?)(?:```|$)/gi;

    enhanced = enhanced.replace(lastResortCodeBlockPattern, (match, language, content) => {
      const blockHash = this._hashBlock(match);

      if (processed.has(blockHash)) {
        return processed.get(blockHash)!;
      }

      // Skip if this looks like a shell command sequence
      if (this._isShellCommand(content, language)) {
        return match;
      }

      // Infer a file name from the content
      const filePath = this._inferFileNameFromContent(content, language);
      const artifactId = `artifact-${messageId}-${this._artifactCounter++}`;
      const wrapped = this._wrapInArtifact(artifactId, filePath, content.trim());

      logger.debug(`Last-resort auto-wrapped code block (lang=${language}) as file: ${filePath}`);
      processed.set(blockHash, wrapped);

      return wrapped;
    });

    return enhanced;
  }

  private _wrapInArtifact(artifactId: string, filePath: string, content: string): string {
    const title = filePath.split('/').pop() || 'File';

    return `<falborArtifact id="${artifactId}" title="${title}" type="bundled">
<falborAction type="file" filePath="${filePath}">
${content}
</falborAction>
</falborArtifact>`;
  }

  private _wrapInShellAction(content: string, messageId: string): string {
    const artifactId = `artifact-${messageId}-${this._artifactCounter++}`;

    return `<falborArtifact id="${artifactId}" title="Shell Command" type="shell">
<falborAction type="shell">
${content.trim()}
</falborAction>
</falborArtifact>`;
  }

  private _normalizeFilePath(filePath: string): string {
    // Remove quotes, backticks, and clean up
    filePath = filePath.replace(/[`'"]/g, '').trim();

    // Ensure forward slashes
    filePath = filePath.replace(/\\/g, '/');

    // Remove leading ./ if present
    if (filePath.startsWith('./')) {
      filePath = filePath.substring(2);
    }

    // Add leading slash if missing and not a relative path
    if (!filePath.startsWith('/') && !filePath.startsWith('.')) {
      filePath = '/' + filePath;
    }

    return filePath;
  }

  private _isValidFilePath(filePath: string): boolean {
    // Check for valid file extension
    const hasExtension = /\.\w+$/.test(filePath);

    if (!hasExtension) {
      return false;
    }

    // Check for valid characters
    const isValid = /^[\/\w\-\.]+$/.test(filePath);

    if (!isValid) {
      return false;
    }

    // Exclude certain patterns that are likely not real files
    const excludePatterns = [
      /^\/?(tmp|temp|test|example)\//i,
      /\.(tmp|temp|bak|backup|old|orig)$/i,
      /^\/?(output|result|response)\//i, // Common AI response folders
      /^code_\d+\.(sh|bash|zsh)$/i, // Auto-generated shell files (our target issue)
      /^(untitled|new|demo|sample)\d*\./i, // Generic demo names
    ];

    for (const pattern of excludePatterns) {
      if (pattern.test(filePath)) {
        return false;
      }
    }

    return true;
  }

  private _hasFileContext(input: string, codeBlockMatch: string): boolean {
    // Check if there's explicit file context around the code block
    const matchIndex = input.indexOf(codeBlockMatch);

    if (matchIndex === -1) {
      return false;
    }

    // Look for context before the code block
    const beforeContext = input.substring(Math.max(0, matchIndex - 200), matchIndex);
    const afterContext = input.substring(matchIndex + codeBlockMatch.length, matchIndex + codeBlockMatch.length + 100);

    const fileContextPatterns = [
      /\b(create|write|save|add|update|modify|edit|generate)\s+(a\s+)?(new\s+)?file/i,
      /\b(file|filename|filepath)\s*[:=]/i,
      /\b(in|to|as)\s+[`'"]?[\w\-\.\/]+\.[a-z]{2,4}[`'"]?/i,
      /\b(component|module|class|function)\s+\w+/i,
    ];

    const contextText = beforeContext + afterContext;

    return fileContextPatterns.some((pattern) => pattern.test(contextText));
  }

  private _inferFileNameFromContent(content: string, language: string): string {
    // Try to infer component name from content
    const componentMatch = content.match(
      /(?:function|class|const|export\s+default\s+function|export\s+function)\s+(\w+)/,
    );

    if (componentMatch) {
      const name = componentMatch[1];
      const ext = language === 'jsx' ? '.jsx' : language === 'tsx' ? '.tsx' : '.js';

      return `/components/${name}${ext}`;
    }

    // Check for App component
    if (content.includes('function App') || content.includes('const App')) {
      return '/App.jsx';
    }

    // Default to a generic name
    return `/component-${Date.now()}.jsx`;
  }

  private _hashBlock(content: string): string {
    // Simple hash for identifying processed blocks
    let hash = 0;

    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return hash.toString(36);
  }

  private _isShellCommand(content: string, language: string): boolean {
    // Check if language suggests shell execution
    const shellLanguages = ['bash', 'sh', 'shell', 'zsh', 'fish', 'powershell', 'ps1'];
    const isShellLang = shellLanguages.includes(language.toLowerCase());

    if (!isShellLang) {
      return false;
    }

    const trimmedContent = content.trim();
    const lines = trimmedContent
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    // Empty content is not a command
    if (lines.length === 0) {
      return false;
    }

    // First, check if it looks like script content (should NOT be treated as commands)
    if (this._looksLikeScriptContent(trimmedContent)) {
      return false; // This is a script file, not commands to execute
    }

    // Single line commands are likely to be executed
    if (lines.length === 1) {
      return this._isSingleLineCommand(lines[0]);
    }

    // Multi-line: check if it's a command sequence
    return this._isCommandSequence(lines);
  }

  private _isSingleLineCommand(line: string): boolean {
    // Check for command chains with &&, ||, |, ;
    const hasChaining = /[;&|]{1,2}/.test(line);

    if (hasChaining) {
      // Split by chaining operators and check if parts look like commands
      const parts = line.split(/[;&|]{1,2}/).map((p) => p.trim());
      return parts.every((part) => part.length > 0 && !this._looksLikeScriptContent(part));
    }

    // Check for common command prefix patterns
    const prefixPatterns = [
      /^sudo\s+/, // sudo commands
      /^time\s+/, // time profiling
      /^nohup\s+/, // background processes
      /^watch\s+/, // repeated execution
      /^env\s+\w+=\w+\s+/, // environment variable setting
    ];

    // Remove prefixes to check the actual command
    let cleanLine = line;

    for (const prefix of prefixPatterns) {
      cleanLine = cleanLine.replace(prefix, '');
    }

    // Optimized O(1) lookup using Map
    for (const [, pattern] of this._commandPatternMap) {
      if (pattern.test(cleanLine)) {
        return true;
      }
    }

    // Fallback to simple command detection
    return this._isSimpleCommand(cleanLine);
  }

  private _isCommandSequence(lines: string[]): boolean {
    // If most lines look like individual commands, treat as command sequence
    const commandLikeLines = lines.filter(
      (line) =>
        line.length > 0 && !line.startsWith('#') && (this._isSingleLineCommand(line) || this._isSimpleCommand(line)),
    );

    // If more than 70% of non-comment lines are commands, treat as command sequence
    return commandLikeLines.length / lines.length > 0.7;
  }

  private _isSimpleCommand(line: string): boolean {
    // Simple heuristics for basic commands
    const words = line.split(/\s+/);

    if (words.length === 0) {
      return false;
    }

    const firstWord = words[0];

    // Don't treat variable assignments as commands (script-like)
    if (line.includes('=') && !line.startsWith('export ') && !line.startsWith('env ') && !firstWord.includes('=')) {
      return false;
    }

    // Don't treat function definitions as commands
    if (line.includes('function ') || line.match(/^\w+\s*\(\s*\)/)) {
      return false;
    }

    // Don't treat control structures as commands
    if (/^(if|for|while|case|function|until|select)\s/.test(line)) {
      return false;
    }

    // Don't treat here-documents as commands
    if (line.includes('<<') || line.startsWith('EOF') || line.startsWith('END')) {
      return false;
    }

    // Don't treat multi-line strings as commands
    if (line.includes('"""') || line.includes("'''")) {
      return false;
    }

    // Additional command-like patterns (fallback for unmatched commands)
    const commandLikePatterns = [
      /^[a-z][a-z0-9-_]*$/i, // Simple command names (like 'ls', 'grep', 'my-script')
      /^\.\/[a-z0-9-_./]+$/i, // Relative executable paths (like './script.sh', './bin/command')
      /^\/[a-z0-9-_./]+$/i, // Absolute executable paths (like '/usr/bin/command')
      /^[a-z][a-z0-9-_]*\s+-.+/i, // Commands with flags (like 'command --flag')
    ];

    // Check if the first word looks like a command
    const looksLikeCommand = commandLikePatterns.some((pattern) => pattern.test(firstWord));

    return looksLikeCommand;
  }

  private _looksLikeScriptContent(content: string): boolean {
    const lines = content.trim().split('\n');

    // Indicators that this is a script file rather than commands to execute
    const scriptIndicators = [
      /^#!/, // Shebang
      /function\s+\w+/, // Function definitions
      /^\w+\s*\(\s*\)\s*\{/, // Function definition syntax
      /^(if|for|while|case)\s+.*?(then|do|in)/, // Control structures
      /^\w+=[^=].*$/, // Variable assignments (not comparisons)
      /^(local|declare|readonly)\s+/,
      /^(source|\.)\s+/, // Source other scripts
      /^(exit|return)\s+\d+/, // Exit codes
    ];

    // Check each line for script indicators
    for (const line of lines) {
      const trimmedLine = line.trim();

      if (trimmedLine.length === 0 || trimmedLine.startsWith('#')) {
        continue; // Skip empty lines and comments
      }

      if (scriptIndicators.some((pattern) => pattern.test(trimmedLine))) {
        return true;
      }
    }

    return false;
  }

  private _isShellScript(content: string): boolean {
    const lines = content.trim().split('\n');
    if (lines.length > 5) return true;
    if (lines[0]?.startsWith('#!/')) return true;

    // Check for common bash scripting constructs
    const scriptPatterns = [
      /\bif\s+\[/i,          // if [ ... ]
      /\bfor\s+.*\s+in\b/i,  // for ... in
      /\bwhile\s+/i,         // while ...
      /\bfunction\s+\w+/i,   // function name()
      /\w+\(\)\s*\{/,        // name() {
      /\bcase\s+.*\s+in\b/i, // case ... in
    ];

    return scriptPatterns.some(pattern => pattern.test(content));
  }

  private _detectAndWrapShellCommands(_messageId: string, input: string, processed: Map<string, string>): string {
    // Pattern to detect standalone shell code blocks that look like commands
    const shellCommandPattern = /```(bash|sh|shell|zsh|fish|powershell|ps1)\n([\s\S]*?)```/gi;

    return input.replace(shellCommandPattern, (match, language, content) => {
      const blockHash = this._hashBlock(match);

      if (processed.has(blockHash)) {
        return processed.get(blockHash)!;
      }

      // Check if it's actually a script instead of a command
      if (this._isShellScript(content)) {
        logger.debug(`Shell block detected as script, skipping command wrap`);
        // If it looks like a script, let the file detection patterns handle it
        return match;
      }

      const artifactId = `artifact-${_messageId}-${this._artifactCounter++}`;
      const wrapped = this._wrapInShellAction(content, _messageId);

      processed.set(blockHash, wrapped);
      logger.debug(`Auto-wrapped standalone shell command`);

      return wrapped;
    });
  }

  reset() {
    super.reset();
    this._processedCodeBlocks.clear();
    this._artifactCounter = 0;
  }
}