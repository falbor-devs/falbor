import { db } from './app/lib/db';
import { workspaces } from './app/lib/db/schema';

async function main() {
    console.log('Resetting onboardingCompleted to false for all workspaces...');
    await db.update(workspaces).set({ onboardingCompleted: false });
    console.log('Successfully reset!');
    process.exit(0);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
