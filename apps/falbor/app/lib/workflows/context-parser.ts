export function parseContext(template: string, context: Record<string, any>): string {
  if (typeof template !== 'string') return template;

  return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
    const value = getNestedValue(context, path.trim());
    return value !== undefined ? String(value) : match;
  });
}
function getNestedValue(obj: Record<string, any>, path: string): any {
  return path.split('.').reduce((acc, part) => {
    return acc && acc[part] !== undefined ? acc[part] : undefined;
  }, obj);
}
export function parseObjectContext(obj: any, context: Record<string, any>): any {
  if (typeof obj === 'string') {
    return parseContext(obj, context);
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => parseObjectContext(item, context));
  }

  if (obj !== null && typeof obj === 'object') {
    const newObj: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      newObj[key] = parseObjectContext(value, context);
    }
    return newObj;
  }

  return obj;
}
