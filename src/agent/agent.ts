import Anthropic from "@anthropic-ai/sdk";
import type { MessageParam, ContentBlockParam, ToolUseBlock, ToolResultBlockParam } from "@anthropic-ai/sdk/resources/messages.js";
import { allTools, toolMap } from "../tools/index.js";
import { buildSystemPrompt } from "./system-prompt.js";
import { buildContext } from "./context-builder.js";
import { auditAgentRun } from "../guardrails/audit-logger.js";
import { checkRateLimit, trackInvocationStart, trackInvocationEnd } from "../guardrails/rate-limiter.js";
import { checkSupplierOrder, checkRefund, checkPriceChange } from "../guardrails/spending-limits.js";
import { getProduct } from "../db/queries/products.queries.js";
import { requestApproval } from "../guardrails/approval-gate.js";
import { logger } from "../utils/logger.js";
import type { AgentEvent, AgentResult, ToolCallRecord } from "./types.js";

const anthropic = new Anthropic();
const MAX_ITERATIONS = 15;

// Tools that need spending limit checks before execution
const SPENDING_CHECKED_TOOLS: Record<string, (input: Record<string, unknown>) => { allowed: boolean; requiresApproval: boolean; reason?: string }> = {
  aliexpress_create_order: (input) => {
    const amount = (input.estimatedCost as number) || 50;
    return checkSupplierOrder(amount);
  },
  shopify_create_refund: (input) => {
    const amount = (input.amount as number) || 0;
    return checkRefund(amount);
  },
  shopify_update_product: (input) => {
    const productId = input.productId as string;
    if (!productId) return { allowed: true, requiresApproval: false };

    const dbProduct = getProduct(productId);
    if (!dbProduct?.shopifyPrice) return { allowed: true, requiresApproval: false };

    // Check for price changes in variants
    const variants = input.variants as Array<{ price?: string }> | undefined;
    const newPrice = variants?.[0]?.price ? parseFloat(variants[0].price) : null;
    if (newPrice === null) return { allowed: true, requiresApproval: false };

    return checkPriceChange(dbProduct.shopifyPrice, newPrice);
  },
};

export async function runAgent(event: AgentEvent): Promise<AgentResult> {
  const startTime = Date.now();
  const toolCalls: ToolCallRecord[] = [];
  let inputTokens = 0;
  let outputTokens = 0;

  // Rate limit check
  const rateCheck = checkRateLimit(
    Number(process.env.MAX_INVOCATIONS_PER_HOUR) || 10
  );
  if (!rateCheck.allowed) {
    logger.warn({ reason: rateCheck.reason }, "Agent invocation rate-limited");
    return {
      summary: `Rate limited: ${rateCheck.reason}`,
      toolCalls: [],
      inputTokens: 0,
      outputTokens: 0,
      durationMs: Date.now() - startTime,
      outcome: "error",
    };
  }

  trackInvocationStart();

  try {
    const systemPrompt = buildSystemPrompt();
    const userMessage = buildContext(event);

    // Build the Claude tools array (just definitions, not executors)
    const claudeTools = allTools.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.input_schema as Anthropic.Messages.Tool.InputSchema,
    }));

    const messages: MessageParam[] = [
      { role: "user", content: userMessage },
    ];

    let iteration = 0;
    let finalSummary = "";

    while (iteration < MAX_ITERATIONS) {
      iteration++;
      logger.info({ iteration, event: event.source }, "Agent iteration");

      const response = await anthropic.messages.create({
        model: process.env.CLAUDE_MODEL || "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: systemPrompt,
        messages,
        tools: claudeTools,
      });

      inputTokens += response.usage.input_tokens;
      outputTokens += response.usage.output_tokens;

      // Check if Claude wants to use tools
      const toolUseBlocks = response.content.filter(
        (block): block is ToolUseBlock => block.type === "tool_use"
      );

      // Extract any text response
      const textBlocks = response.content.filter(
        (block) => block.type === "text"
      );
      if (textBlocks.length > 0) {
        finalSummary = (textBlocks[textBlocks.length - 1] as { text: string }).text;
      }

      // If no tool calls, we're done
      if (toolUseBlocks.length === 0 || response.stop_reason === "end_turn") {
        if (toolUseBlocks.length === 0) break;
      }

      // Process each tool call
      const toolResults: ToolResultBlockParam[] = [];

      for (const toolUse of toolUseBlocks) {
        const toolDef = toolMap.get(toolUse.name);
        const toolStart = Date.now();

        if (!toolDef) {
          toolResults.push({
            type: "tool_result",
            tool_use_id: toolUse.id,
            content: `Error: Unknown tool "${toolUse.name}"`,
            is_error: true,
          });
          continue;
        }

        // Guardrail: check spending limits for financial tools
        const spendingCheck = SPENDING_CHECKED_TOOLS[toolUse.name];
        if (spendingCheck) {
          const check = spendingCheck(toolUse.input as Record<string, unknown>);
          if (!check.allowed) {
            logger.warn(
              { tool: toolUse.name, reason: check.reason },
              "Tool blocked by spending limit"
            );

            if (check.requiresApproval) {
              const approvalId = await requestApproval({
                description: `${toolUse.name}: ${check.reason}`,
                amount: (toolUse.input as Record<string, unknown>).estimatedCost as number,
                orderId: (toolUse.input as Record<string, unknown>).orderId as string,
              });

              toolResults.push({
                type: "tool_result",
                tool_use_id: toolUse.id,
                content: `BLOCKED by spending limit: ${check.reason}. Approval requested (ID: ${approvalId}). The owner has been notified on Slack. You should inform the owner and stop trying to execute this action until approval is granted.`,
              });

              toolCalls.push({
                toolName: toolUse.name,
                input: toolUse.input as Record<string, unknown>,
                output: { blocked: true, approvalId, reason: check.reason },
                durationMs: Date.now() - toolStart,
              });
              continue;
            }

            toolResults.push({
              type: "tool_result",
              tool_use_id: toolUse.id,
              content: `BLOCKED: ${check.reason}`,
              is_error: true,
            });
            continue;
          }
        }

        // Execute the tool
        try {
          const result = await toolDef.execute(
            toolUse.input as Record<string, unknown>
          );
          const resultStr =
            typeof result === "string" ? result : JSON.stringify(result, null, 2);

          // Truncate very long results
          const truncated =
            resultStr.length > 5000
              ? resultStr.slice(0, 5000) + "\n... [truncated]"
              : resultStr;

          toolResults.push({
            type: "tool_result",
            tool_use_id: toolUse.id,
            content: truncated,
          });

          toolCalls.push({
            toolName: toolUse.name,
            input: toolUse.input as Record<string, unknown>,
            output: result,
            durationMs: Date.now() - toolStart,
          });

          logger.info(
            { tool: toolUse.name, durationMs: Date.now() - toolStart },
            "Tool executed"
          );
        } catch (error) {
          const errorMsg =
            error instanceof Error ? error.message : String(error);
          logger.error(
            { tool: toolUse.name, error: errorMsg },
            "Tool execution failed"
          );

          toolResults.push({
            type: "tool_result",
            tool_use_id: toolUse.id,
            content: `Error executing ${toolUse.name}: ${errorMsg}`,
            is_error: true,
          });

          toolCalls.push({
            toolName: toolUse.name,
            input: toolUse.input as Record<string, unknown>,
            output: { error: errorMsg },
            durationMs: Date.now() - toolStart,
          });
        }
      }

      // If there were no tool use blocks that needed processing, break
      if (toolUseBlocks.length === 0) break;

      // Add assistant message and tool results to conversation
      messages.push({
        role: "assistant",
        content: response.content as ContentBlockParam[],
      });
      messages.push({
        role: "user",
        content: toolResults,
      });
    }

    if (iteration >= MAX_ITERATIONS) {
      logger.warn({ event: event.source }, "Agent hit max iterations");
    }

    const result: AgentResult = {
      summary: finalSummary || "Agent completed without text response",
      toolCalls,
      inputTokens,
      outputTokens,
      durationMs: Date.now() - startTime,
      outcome:
        iteration >= MAX_ITERATIONS
          ? "partial"
          : toolCalls.some((t) => (t.output as Record<string, unknown>)?.blocked)
            ? "approval_pending"
            : "success",
    };

    // Audit log
    try {
      await auditAgentRun(event, result);
    } catch (err) {
      logger.error({ err }, "Failed to audit agent run");
    }

    return result;
  } finally {
    trackInvocationEnd();
  }
}
