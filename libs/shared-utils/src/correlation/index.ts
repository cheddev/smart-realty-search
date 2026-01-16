export type CorrelationContext = {
  correlationId?: string;
};

export const getCorrelationId = (context: CorrelationContext) =>
  context.correlationId;
