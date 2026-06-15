export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
  }
}

export const assertNonEmpty = (value: string, message: string): void => {
  if (value.trim().length === 0) {
    throw new AppError(message, 'validation.empty');
  }
};

export const assertPositive = (value: number, message: string): void => {
  if (!Number.isFinite(value) || value <= 0) {
    throw new AppError(message, 'validation.positive');
  }
};

export const assertNonNegative = (value: number, message: string): void => {
  if (!Number.isFinite(value) || value < 0) {
    throw new AppError(message, 'validation.nonNegative');
  }
};
