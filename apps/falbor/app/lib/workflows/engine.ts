export class WorkflowEngine {
  async execute(workflowId: string, inputData: any) {
    console.log(`Executing workflow ${workflowId} with input`, inputData);
    return { success: true, message: 'Workflow triggered' };
  }
}

export const workflowEngine = new WorkflowEngine();
