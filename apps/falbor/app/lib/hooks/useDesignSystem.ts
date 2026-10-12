import { webcontainer } from '~/lib/webcontainer';
import type { ElementInfo } from '~/components/workbench/Inspector';

export function useDesignSystem() {
  const handleLiveUpdate = (changes: Record<string, string>) => {
    document.querySelectorAll('iframe').forEach(iframe => {
      iframe.contentWindow?.postMessage({
        type: 'INSPECTOR_APPLY_STYLE',
        styles: changes
      }, '*');
    });
  };
  function injectIntoOpeningTag(line: string, tagName: string, styleEntries: string, src?: string): string {
    let tagRegex = new RegExp(`<${tagName}(\\s|/?>|$)`, 'i');
    let match = tagRegex.exec(line);

    if (!match) {
      tagRegex = new RegExp(`<([A-Za-z0-9_]+)(\\s|/?>|$)`, 'i');
      match = tagRegex.exec(line);

      if (!match) return line;
    }

    const tagStart = match.index;
    const actualTagNameMatch = match[1];
    const actualTagName = match[0].replace('<', '').trim().split(/[\s\/>]/)[0];

    let inDouble = false;
    let inSingle = false;
    let inCurly = 0;

    for (let i = tagStart + 1; i < line.length; i++) {
      const ch = line[i];

      if (!inDouble && !inSingle && ch === '{') { inCurly++; continue; }
      if (!inDouble && !inSingle && ch === '}') { inCurly--; continue; }
      if (inCurly > 0) continue;

      if (!inSingle && ch === '"') { inDouble = !inDouble; continue; }
      if (!inDouble && ch === "'") { inSingle = !inSingle; continue; }
      if (inDouble || inSingle) continue;

      if (ch === '>') {
        const before = line.slice(0, i);
        const after = line.slice(i);
        const isSelfClose = before.endsWith('/');
        if (/style=\{\{/.test(before)) {
          const merged = before.replace(/style=\{\{([^}]*)\}\}/, (_m, existing) => {
            const trimmed = existing.trim();
            return `style={{ ${trimmed}${trimmed ? ', ' : ''}${styleEntries} }}`;
          });
          return merged + after;
        }

        let insertion = '';
        if (styleEntries) insertion += ` style={{ ${styleEntries} }}`;
        if (src && (tagName === 'img' || actualTagName.toLowerCase() === 'img' || actualTagName.toLowerCase() === 'image')) {
          if (/src=/.test(before)) {
            const patched = before
              .replace(/src="[^"]*"/, `src="${src}"`)
              .replace(/src=\{[^}]*\}/, `src="${src}"`);
            return patched + insertion + after;
          } else {
            insertion = ` src="${src}"` + insertion;
          }
        }

        if (isSelfClose) {
          return before.slice(0, -1) + insertion + ' /' + after.slice(1);
        }
        return before + insertion + after;
      }
    }

    return line;
  }

  const handleDesignSystemSave = async (selectedElement: ElementInfo, changes: Record<string, string>) => {
    if (!selectedElement) return false;

    const WORK_DIR = '/home/project';
    let actualFilePath = '';
    let lineIndex = -1;
    let fileContentStr = '';
    const tagLower = selectedElement.tagName.toLowerCase();
    const tagName = selectedElement.tagName;

    console.log('[DesignSystem] Saving for element:', selectedElement.tagName, selectedElement.className);
    console.log('[DesignSystem] Source info:', JSON.stringify(selectedElement.source));
    console.log('[DesignSystem] Changes:', JSON.stringify(changes));

    const wc = await webcontainer;
    if (selectedElement.source) {
      let fileName = selectedElement.source.fileName;
      console.log('[DesignSystem] Raw fileName from fiber:', fileName);
      if (fileName.startsWith(WORK_DIR)) {
        fileName = fileName.slice(WORK_DIR.length).replace(/^\//, '');
      } else if (fileName.includes('/home/project/')) {
        fileName = fileName.split('/home/project/')[1];
      } else if (fileName.startsWith('/')) {
        fileName = fileName.replace(/^\//, '');
      }

      console.log('[DesignSystem] Normalized fileName:', fileName);

      try {
        const content = await wc.fs.readFile(fileName, 'utf-8');
        actualFilePath = fileName;
        lineIndex = selectedElement.source.lineNumber - 1;
        fileContentStr = content;
        console.log('[DesignSystem] Found file via source map:', fileName, 'at line', lineIndex + 1);
      } catch (e) {
        console.warn('[DesignSystem] Could not read via source map:', fileName, e);
      }
    }
    if (!actualFilePath) {
      const { className } = selectedElement;
      const EXCLUDED_CLASSES = new Set(['inspector-highlight', 'inspector-active']);
      const allClasses = className
        ? className.split(' ').filter(c => c.trim().length > 2 && !c.includes(':') && !EXCLUDED_CLASSES.has(c.trim()))
        : [];
      const searchClasses = allClasses.slice(0, 3);

      console.log('[DesignSystem] Heuristic search for tag:', tagLower, 'classes:', searchClasses);

      const scanDir = async (dir: string): Promise<boolean> => {
        try {
          const entries = await wc.fs.readdir(dir, { withFileTypes: true });
          for (const entry of entries) {
            const fullPath = dir === '.' ? entry.name : `${dir}/${entry.name}`;

            if (entry.isDirectory() && !['node_modules', '.next', '.git', 'dist', 'build', 'public'].includes(entry.name)) {
              if (await scanDir(fullPath)) return true;
            } else if (entry.isFile() && (entry.name.endsWith('.tsx') || entry.name.endsWith('.jsx'))) {
              try {
                const content = await wc.fs.readFile(fullPath, 'utf-8');
                const lines = content.split('\n');

                for (let i = 0; i < lines.length; i++) {
                  const line = lines[i];
                  const hasTag = line.includes(`<${tagLower}`) || line.includes(`<${tagName}`);
                  if (!hasTag) continue;
                  if (searchClasses.length > 0) {
                    const matchedClasses = searchClasses.filter(cls => line.includes(cls));
                    if (matchedClasses.length === 0) continue;
                  }

                  actualFilePath = fullPath;
                  lineIndex = i;
                  fileContentStr = content;
                  console.log('[DesignSystem] Heuristic found:', fullPath, 'line', i + 1);
                  return true;
                }
              } catch (e) {
              }
            }
          }
        } catch (e) {
          console.error('[DesignSystem] Error scanning dir:', dir, e);
        }
        return false;
      };
      await scanDir('.');
    }

    if (!actualFilePath || lineIndex === -1 || !fileContentStr) {
      console.error('[DesignSystem] Could not find file. Element:', selectedElement.tagName, selectedElement.className);
      alert('Could not find the source file. Open your browser console (F12) and look for [DesignSystem] logs to help diagnose.');
      return false;
    }
    const styleEntries = Object.entries(changes)
      .filter(([k, v]) => v !== '' && k !== 'src')
      .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
      .join(', ');

    if (!styleEntries && !changes.src) return false;

    const lines = fileContentStr.split('\n');
    let line = lines[lineIndex];
    console.log('[DesignSystem] Target line:', JSON.stringify(line));

    if (styleEntries || (changes.src && tagLower === 'img')) {
      const newLine = injectIntoOpeningTag(line, tagLower, styleEntries, changes.src);

      if (newLine === line) {
        console.warn('[DesignSystem] Could not inject styles into line:', JSON.stringify(line));
      }
      line = newLine;
    }

    lines[lineIndex] = line;
    const newContent = lines.join('\n');
    console.log('[DesignSystem] Modified line:', JSON.stringify(line));
    console.log('[DesignSystem] Writing to:', actualFilePath);
    await wc.fs.writeFile(actualFilePath, newContent);

    console.log('[DesignSystem] Saved successfully!');
    return true;
  };

  return {
    handleLiveUpdate,
    handleDesignSystemSave
  };
}
