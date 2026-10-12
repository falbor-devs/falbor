import { execSync } from "child_process";

try {
  console.log("Running drizzle-kit push...");
  execSync("npx drizzle-kit push", { stdio: "inherit" });
  console.log("Success!");
} catch (e) {
  console.error("Failed:", e);
}
