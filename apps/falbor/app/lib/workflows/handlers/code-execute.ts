import ivm from 'isolated-vm';

export async function handleCodeExecute(nodeData: any, context: Record<string, any>) {
  const { code } = nodeData;

  if (!code) {
    throw new Error('Code Execution node requires code');
  }
  const isolate = new ivm.Isolate({ memoryLimit: 128 });
  const ivmContext = await isolate.createContext();
  const jail = ivmContext.global;
  await jail.set('global', jail.derefInto());
  await jail.set('workflowContext', new ivm.ExternalCopy(context).copyInto());

  const logs: string[] = [];
  await jail.set('log', new ivm.Reference((...args: any[]) => {
    logs.push(args.join(' '));
  }));

  const scriptStr = `
    const console = { log };
    (async function() {
      ${code}
    })();
  `;

  try {
    const script = await isolate.compileScript(scriptStr);
    const resultRef = await script.run(ivmContext, { promise: true, reference: true });

    let result = undefined;
    if (resultRef && typeof resultRef.copy === 'function') {
      result = await resultRef.copy();
    }

    return {
      result,
      logs
    };
  } catch (error: any) {
    throw new Error(`Code Execution Failed: ${error.message}`);
  } finally {
    isolate.dispose();
  }
}
