import { db } from '../apps/falbor/app/lib/db';
import { stayupProjects, stayupIssues, stayupEvents } from '../apps/falbor/app/lib/db/schema';
import { v4 as uuidv4 } from 'uuid';
async function seed() {
  console.log("Seeding StayUp dummy data...");
  const firstUser = await db.query.users.findFirst();
  if (!firstUser) {
    console.error("No users found. Create a user first.");
    process.exit(1);
  }
  const newProjects = await db.insert(stayupProjects).values({
    userId: firstUser.id,
    name: "Production Web App",
    apiKey: `su_${uuidv4()}`
  }).returning();
  const project = newProjects[0];
  const issue1 = await db.insert(stayupIssues).values({
    projectId: project.id,
    fingerprint: "err-404-api",
    title: "API Endpoint Not Found (/v1/users)",
    message: "Failed to load resource: the server responded with a status of 404 ()",
    severity: "warning",
    environment: "production",
    status: "unresolved",
    eventCount: 23,
  }).returning();
  const issue2 = await db.insert(stayupIssues).values({
    projectId: project.id,
    fingerprint: "err-type-undefined",
    title: "TypeError: Cannot read properties of undefined (reading 'length')",
    message: "TypeError: Cannot read properties of undefined (reading 'length')",
    severity: "error",
    environment: "production",
    status: "unresolved",
    eventCount: 142,
  }).returning();
  await db.insert(stayupEvents).values({
    issueId: issue1[0].id,
    projectId: project.id,
    stacktrace: "Error: 404\n    at fetchUsers (app.js:10:4)\n    at Object.load (app.js:20:1)",
    url: "https://app.falbor.com/users",
    browserInfo: { userAgent: "Mozilla/5.0 Chrome/114.0" },
    metadata: { userId: "user_123" }
  });
  await db.insert(stayupEvents).values({
    issueId: issue2[0].id,
    projectId: project.id,
    stacktrace: "TypeError: Cannot read properties of undefined\n    at List.render (list.js:5:22)",
    url: "https://app.falbor.com/dashboard",
    browserInfo: { userAgent: "Mozilla/5.0 Safari/605.1.15" },
    metadata: { component: "DashboardList" }
  });
  console.log("Seeding complete! You can now view the dashboard.");
  process.exit(0);
}
seed().catch(console.error);