import { runSeed } from "./seed-runner";

runSeed()
  .then((result) => {
    console.log("Seed completed", result);
  })
  .catch(async (error) => {
    console.error("Seed failed", error);
    process.exitCode = 1;
  });
