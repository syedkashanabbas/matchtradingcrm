import cron from "node-cron";
import { processDueProvisions } from "../modules/provisioning/provisioning.service";
import { processDueServiceCommands } from "../modules/provisioning/service-control.service";

let running = false;

/**
 * Provisioning worker (spec §5.2): every minute, processes provisioning
 * records in non-terminal states and queued service commands with an
 * idempotent state machine + exponential backoff.
 */
export const startProvisioningCron = () => {
  cron.schedule("* * * * *", async () => {
    if (running) return; // avoid overlapping ticks
    running = true;
    try {
      await processDueProvisions();
      await processDueServiceCommands();
    } catch (error) {
      console.error("❌ Provisioning cron error:", error);
    } finally {
      running = false;
    }
  });
  console.log("⏱  Provisioning worker scheduled (every minute)");
};
