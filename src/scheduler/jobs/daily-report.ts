import { runAgent } from "../../agent/agent.js";
import { getBalance, getReport } from "../../db/queries/ledger.queries.js";

export async function dailyReport() {
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  const today = new Date().toISOString().split("T")[0];

  const balance = getBalance();
  const yesterdayEntries = getReport(yesterday, today);

  if (yesterdayEntries.length === 0 && balance.totalRevenue === 0) return;

  await runAgent({
    type: "scheduled",
    source: "cron/daily-report",
    priority: "low",
    prompt: `Generate and post the daily business report to Slack #arkwright-orders.

**Overall Financial Summary:**
- Total Revenue: $${balance.totalRevenue.toFixed(2)}
- Total Expenses: $${balance.totalExpenses.toFixed(2)}
- Total Refunds: $${balance.totalRefunds.toFixed(2)}
- Net Profit: $${balance.netProfit.toFixed(2)}

**Yesterday's Activity (${yesterday}):**
${yesterdayEntries.length} transactions:
${yesterdayEntries.map((e) => `- ${e.type}: $${e.amount.toFixed(2)} - ${e.description}`).join("\n") || "No transactions"}

Please format this as a clean Slack message with the key metrics highlighted. Include any observations or recommendations.`,
    context: { balance, yesterdayEntries },
  });
}
