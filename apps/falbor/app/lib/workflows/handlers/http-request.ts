export async function handleHttpRequest(nodeData: any) {
  const { url, method = 'GET', headers = {}, body } = nodeData;

  if (!url) {
    throw new Error('HTTP Request node requires a URL');
  }

  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  if (body && ['POST', 'PUT', 'PATCH'].includes(method)) {
    options.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  const response = await fetch(url, options);
  
  let responseData;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    responseData = await response.json();
  } else {
    responseData = await response.text();
  }

  return {
    status: response.status,
    statusText: response.statusText,
    body: responseData,
  };
}
