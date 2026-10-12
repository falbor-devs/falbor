import { db } from '../app/lib/db';
import { mcpConnections } from '../app/lib/db/schema';

async function main() {
    const connections = await db.select().from(mcpConnections);
    console.log(JSON.stringify(connections, null, 2));
}

main().catch(console.error);
