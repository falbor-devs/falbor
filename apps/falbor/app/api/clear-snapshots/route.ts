import { NextResponse } from 'next/server';
import { db } from '~/lib/db';
import { chatSnapshots } from '~/lib/db/schema';

export async function GET() {
  try {
    await db.delete(chatSnapshots);
    return NextResponse.json({ success: true, message: 'Snapshots cleared. Reload your chat to restore files from history.' });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
