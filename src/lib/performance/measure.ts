type MeasureOptions = {
  context?: Record<string, string | number | boolean | null | undefined>;
  thresholdMs?: number;
};

function shouldLogPerformance(): boolean {
  return (
    process.env.BEESPO_PERF === "1" ||
    process.env.NODE_ENV === "development"
  );
}

export async function measureAsync<T>(
  name: string,
  fn: () => Promise<T>,
  options: MeasureOptions = {}
): Promise<T> {
  if (!shouldLogPerformance()) {
    return fn();
  }

  const start = performance.now();

  try {
    return await fn();
  } finally {
    const durationMs = performance.now() - start;
    if (durationMs >= (options.thresholdMs ?? 0)) {
      const context =
        options.context && Object.keys(options.context).length > 0
          ? ` ${JSON.stringify(options.context)}`
          : "";

      console.info(
        `[perf] ${name} ${durationMs.toFixed(1)}ms${context}`
      );
    }
  }
}
