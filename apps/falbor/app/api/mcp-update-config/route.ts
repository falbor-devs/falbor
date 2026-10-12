import { NextResponse } from "next/server";
const json = NextResponse.json;
import { createScopedLogger } from '~/utils/logger';
import { MCPService, type MCPConfig } from '~/lib/services/mcpService';

const logger = createScopedLogger('api.mcp-update-config');

import { withSecurity } from '~/lib/security';
import { requireUser, handleAuthError } from '~/lib/auth/auth-helpers';

const updatePost = withSecurity(async ({ request }) => {
  try {
    // Enforce authentication
    await requireUser();

    const mcpConfig = (await request.json()) as MCPConfig;

    if (!mcpConfig || typeof mcpConfig !== 'object') {
      return Response.json({ error: 'Invalid MCP servers configuration' }, { status: 400 });
    }

    const mcpService = MCPService.getInstance();
    const serverTools = await mcpService.updateConfig(mcpConfig);

    return Response.json(serverTools);
  } catch (error) {
    if ((error as any).status) return handleAuthError(error);
    logger.error('Error updating MCP config:', error);
    return Response.json({ error: 'Failed to update MCP config' }, { status: 500 });
  }
});

export async function POST(request: Request) {
  return updatePost({ request, context: { env: process.env as any } });
}
