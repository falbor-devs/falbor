export function cleanStackTrace(stackTrace: string): string {
  const cleanUrl = (url: string): string => {
    const regex = /^https?:\/\/[^\/]+\.webcontainer-api\.io(\/.*)?$/;

    if (!regex.test(url)) {
      return url;
    }

    const pathRegex = /^https?:\/\/[^\/]+\.webcontainer-api\.io\/(.*?)$/;
    const match = url.match(pathRegex);

    return match?.[1] || '';
  };
  return stackTrace
    .split('\n')
    .map((line) => {
      return line.replace(/(https?:\/\/[^\/]+\.webcontainer-api\.io\/[^\s\)]+)/g, (match) => cleanUrl(match));
    })
    .join('\n');
}