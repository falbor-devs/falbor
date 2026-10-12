import { db } from '~/lib/db';
import { workflowJobs, workflowExecutions, workflowExecutionLogs } from '~/lib/db/schema';
import { eq, lte, and } from 'drizzle-orm';
import { handleHttpRequest } from './handlers/http-request';
import { handleCodeExecute } from './handlers/code-execute';
import { handleDelay } from './handlers/delay';
import { parseObjectContext } from './context-parser';

export class WorkflowWorker {
  private isRunning = false;
  private pollIntervalMs = 5000;

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.poll();
  }

  stop() {
    this.isRunning = false;
  }

  private async poll() {
    if (!this.isRunning) return;

    try {
      await this.processNextJob();
    } catch (error) {
      console.error('Worker polling error:', error);
    } finally {
      setTimeout(() => this.poll(), this.pollIntervalMs);
    }
  }

  private async processNextJob() {
    const [job] = await db.select()
      .from(workflowJobs)
      .where(
        and(
          eq(workflowJobs.status, 'pending'),
          lte(workflowJobs.runAt, new Date())
        )
      )
      .limit(1);

    if (!job) return;
    await db.update(workflowJobs)
      .set({ status: 'running', updatedAt: new Date() })
      .where(eq(workflowJobs.id, job.id));

    try {
      const [execution] = await db.select()
        .from(workflowExecutions)
        .where(eq(workflowExecutions.id, job.executionId))
        .limit(1);

      if (!execution) throw new Error('Execution not found');
      const [logEntry] = await db.insert(workflowExecutionLogs)
        .values({
          executionId: job.executionId,
          stepId: job.stepId,
          status: 'pending',
          input: job.payload,
        })
        .returning();

      const parsedPayload = parseObjectContext(job.payload, execution.context || {});
      const nodeType = parsedPayload.type;

      let output: any = {};

      switch (nodeType) {
        case 'http-request':
          output = await handleHttpRequest(parsedPayload);
          break;
        case 'code-execute':
          output = await handleCodeExecute(parsedPayload, execution.context || {});
          break;
        case 'delay':
          output = await handleDelay(parsedPayload, job.id);
          break;
        default:
          throw new Error(`Unsupported node type: ${nodeType}`);
      }
      const newContext = { ...(execution.context as any), [job.stepId]: output };
      await db.update(workflowExecutions)
        .set({ context: newContext })
        .where(eq(workflowExecutions.id, job.executionId));
      if (output && output.__delay) {
        await db.update(workflowJobs)
          .set({ status: 'pending', runAt: output.runAt, updatedAt: new Date() })
          .where(eq(workflowJobs.id, job.id));

        await db.update(workflowExecutionLogs)
          .set({ status: 'success', output: { message: `Waiting until ${output.runAt}` }, completedAt: new Date() })
          .where(eq(workflowExecutionLogs.id, logEntry.id));

        return;
      }
      await db.update(workflowExecutionLogs)
        .set({ status: 'success', output, completedAt: new Date() })
        .where(eq(workflowExecutionLogs.id, logEntry.id));
      await db.update(workflowJobs)
        .set({ status: 'completed', updatedAt: new Date() })
        .where(eq(workflowJobs.id, job.id));
    } catch (error: any) {
      console.error(`Job ${job.id} failed:`, error);
      await db.update(workflowJobs)
        .set({
          status: 'failed',
          error: error.message,
          updatedAt: new Date()
        })
        .where(eq(workflowJobs.id, job.id));
      await db.update(workflowExecutions)
        .set({ status: 'failed', errorLogs: error.message, completedAt: new Date() })
        .where(eq(workflowExecutions.id, job.executionId));
    }
  }
}
export const globalWorker = new WorkflowWorker();
