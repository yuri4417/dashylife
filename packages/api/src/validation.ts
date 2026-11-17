export class ApiError extends Error {
  constructor(public readonly statusCode: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export function validateTimeRange(startTime: unknown, endTime: unknown): void {
  const valid = (value: unknown) => typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
  const startEmpty = startTime === undefined || startTime === null;
  const endEmpty = endTime === undefined || endTime === null;
  if (startEmpty && endEmpty) return;
  if (!valid(startTime) || !valid(endTime) || (startTime as string) >= (endTime as string)) {
    throw new ApiError(400, 'Informe horários de início e fim válidos, com o fim após o início.');
  }
}
