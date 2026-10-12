import { NextRequest, NextResponse } from 'next/server';
import { db } from '~/lib/db';
import { chats, messages, chatSnapshots, templates } from '~/lib/db/schema';
import { getUserId } from '~/lib/auth';
import { eq } from 'drizzle-orm';
import { generateId } from 'ai';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getUserId(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const templateId = params.id;
    
    // 1. Fetch the template
    const [template] = await db.select().from(templates).where(eq(templates.id, templateId)).limit(1);
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    const originalChatId = template.chatId;

    if (!originalChatId) {
      return NextResponse.json({ error: 'Template source not found' }, { status: 404 });
    }

    // 2. Fetch original chat to get some basic details
    const [originalChat] = await db.select().from(chats).where(eq(chats.id, originalChatId)).limit(1);
    if (!originalChat) {
      return NextResponse.json({ error: 'Template source not found' }, { status: 404 });
    }

    // 3. Create a new chat ID
    const newChatId = generateId();

    // 4. Add to database
    await db.insert(chats).values({
      id: newChatId,
      userId,
      title: `${template.name} Project`,
      description: template.shortDescription || 'Created from a template',
      isPublic: false,
    });

    // 5. Add a default message
    const msgId = generateId();
    await db.insert(messages).values({
      id: msgId,
      chatId: newChatId,
      role: 'assistant',
      content: `I've set up the workspace using the **${template.name}** template. What would you like to modify?`,
      createdAt: new Date(),
    });

    // 6. Duplicate snapshot and remove .env
    const [originalSnapshot] = await db.select().from(chatSnapshots).where(eq(chatSnapshots.chatId, originalChatId)).limit(1);
    if (originalSnapshot && originalSnapshot.files) {
      let filesStr = originalSnapshot.files as string;
      try {
        const filesObj = JSON.parse(filesStr);
        if (filesObj['.env']) {
          delete filesObj['.env'];
        }
        filesStr = JSON.stringify(filesObj);
      } catch (e) {
        console.error('Failed to parse snapshot files', e);
      }

      await db.insert(chatSnapshots).values({
        chatId: newChatId,
        userId,
        files: filesStr,
        summary: originalSnapshot.summary,
      });
    }

    return NextResponse.json({ success: true, data: { chatId: newChatId } });
  } catch (error) {
    console.error('Error using template:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
