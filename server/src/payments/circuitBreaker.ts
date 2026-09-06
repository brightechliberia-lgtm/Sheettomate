export class CircuitOpenError extends Error {
  constructor(message = 'Payment provider temporarily unavailable') {
    super(message);
    this.name = 'CircuitOpenError';
  }
}

export function createCircuitBreaker(name: string, threshold = 5, resetMs = 60_000) {
  let failures = 0;
  let openedAt = 0;

  return {
    async exec<T>(fn: () => Promise<T>): Promise<T> {
      if (openedAt && Date.now() - openedAt < resetMs) {
        throw new CircuitOpenError(`${name} circuit open`);
      }
      if (openedAt && Date.now() - openedAt >= resetMs) {
        failures = 0;
        openedAt = 0;
      }
      try {
        const result = await fn();
        failures = 0;
        return result;
      } catch (error) {
        failures += 1;
        if (failures >= threshold) {
          openedAt = Date.now();
        }
        throw error;
      }
    },
  };
}
