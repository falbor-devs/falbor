import { searchProspectsWithApollo } from './apps/falbor/app/lib/agent/growthTools';
import * as dotenv from 'dotenv';
dotenv.config({ path: './apps/falbor/.env' });

async function run() {
  try {
    console.log("Running searchProspectsWithApollo with test filters...");
    const results = await searchProspectsWithApollo({
      jobTitles: ["founder", "ceo"],
      perPage: 2
    });
    console.log("SUCCESS. Results:");
    console.log(JSON.stringify(results, null, 2));
  } catch (e: any) {
    console.error("FAILED. Error:");
    console.error(e.message);
  }
}

run();
