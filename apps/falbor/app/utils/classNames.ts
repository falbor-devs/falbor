type ClassNamesArg = undefined | null | string | number | boolean | Record<string, boolean> | ClassNamesArg[];
export function classNames(...args: ClassNamesArg[]): string {
  let classes = '';

  for (const arg of args) {
    classes = appendClass(classes, parseValue(arg));
  }

  return classes;
}

function parseValue(arg: ClassNamesArg): string {
  if (typeof arg === 'string') {
    return arg;
  }

  if (typeof arg === 'number') {
    return String(arg);
  }

  if (typeof arg !== 'object' || arg === null) {
    return '';
  }

  if (Array.isArray(arg)) {
    return classNames(...arg);
  }

  let classes = '';

  for (const key in arg) {
    if (arg[key]) {
      classes = appendClass(classes, key);
    }
  }

  return classes;
}

function appendClass(value: string, newClass: string | undefined) {
  if (!newClass) {
    return value;
  }

  if (value) {
    return value + ' ' + newClass;
  }

  return value + newClass;
}
