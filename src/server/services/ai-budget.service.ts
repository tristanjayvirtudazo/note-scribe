import "server-only";
import type { AiUsageReport, Task } from "@/server/ai/gemini";
import { AppError } from "@/server/errors";
import { aiUsageRepository } from "@/server/repositories/ai-usage.repository";

// Spend controls for AI generation. Every generation must go through `run`, which
// checks the budget and concurrency before the call and records the outcome after it.

const DAY_MS = 24 * 60 * 60 * 1000;

function envNumber(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

/** Requests allowed across ALL users in any 24-hour window. Raise it when moving off the free tier. */
const DAILY_REQUEST_BUDGET = envNumber("AI_DAILY_REQUEST_BUDGET", 300);
/** Generations that may run at the same time across the whole server process. */
const MAX_CONCURRENT = envNumber("AI_MAX_CONCURRENT", 5);
/** Generations one user may run at the same time. */
const MAX_CONCURRENT_PER_USER = 1;

// In-process counters. On a multi-instance deployment each instance enforces its own share;
// the database-backed daily budget is the hard ceiling either way.
let running = 0;
const runningByUser = new Map<string, number>();

export const aiBudgetService = {
  /**
   * Runs one generation inside the spend controls. `generate` returns the result plus the
   * token report from the Gemini gateway; the report is written to the usage ledger.
   */
  async run<T>(userId: string, task: Task, generate: () => Promise<{ result: T; usage: AiUsageReport }>): Promise<T> {
    if ((runningByUser.get(userId) ?? 0) >= MAX_CONCURRENT_PER_USER) {
      throw new AppError("You already have a generation running. Please wait for it to finish.");
    }
    if (running >= MAX_CONCURRENT) {
      throw new AppError("The AI is busy with other requests right now. Please try again in a moment.");
    }
    const used = await aiUsageRepository.countSince(new Date(Date.now() - DAY_MS));
    if (used >= DAILY_REQUEST_BUDGET) {
      throw new AppError("Today's AI allowance for the whole app has been used up. Please try again tomorrow.");
    }

    running++;
    runningByUser.set(userId, (runningByUser.get(userId) ?? 0) + 1);
    let usage: AiUsageReport | null = null;
    try {
      const outcome = await generate();
      usage = outcome.usage;
      return outcome.result;
    } finally {
      running--;
      const mine = (runningByUser.get(userId) ?? 1) - 1;
      if (mine <= 0) runningByUser.delete(userId);
      else runningByUser.set(userId, mine);
      // Failed calls count too: a request was still sent.
      await aiUsageRepository
        .record({
          userId,
          task,
          model: usage?.model ?? null,
          promptTokens: usage?.promptTokens ?? 0,
          outputTokens: usage?.outputTokens ?? 0,
          thinkingTokens: usage?.thinkingTokens ?? 0,
          ok: usage !== null,
        })
        .catch((error: unknown) => console.error("Could not record AI usage", error));
    }
  },
};
