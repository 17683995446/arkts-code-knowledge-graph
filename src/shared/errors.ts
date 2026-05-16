export class AppError extends Error {
  readonly statusCode: number
  readonly isOperational: boolean
  readonly code: string
  readonly timestamp: Date

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    isOperational: boolean = true
  ) {
    super(message)
    Object.setPrototypeOf(this, new.target.prototype)
    
    this.name = 'AppError'
    this.statusCode = statusCode
    this.code = code
    this.isOperational = isOperational
    this.timestamp = new Date()
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }
  }
}

export class ValidationError extends AppError {
  constructor(message: string, field?: string) {
    super(
      field ? `${field}: ${message}` : message,
      400,
      'VALIDATION_ERROR'
    )
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(
      `${resource} not found`,
      404,
      'NOT_FOUND'
    )
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(
      message,
      409,
      'CONFLICT'
    )
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(
      message,
      401,
      'UNAUTHORIZED'
    )
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(
      message,
      403,
      'FORBIDDEN'
    )
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded') {
    super(
      message,
      429,
      'RATE_LIMIT_EXCEEDED'
    )
  }
}

export class InternalError extends AppError {
  constructor(message: string = 'Internal server error') {
    super(
      message,
      500,
      'INTERNAL_ERROR',
      false
    )
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message: string = 'Service unavailable') {
    super(
      message,
      503,
      'SERVICE_UNAVAILABLE',
      false
    )
  }
}

export function handleError(error: any): AppError {
  if (error instanceof AppError) {
    return error
  }

  if (error.name === 'ValidationError') {
    return new ValidationError(error.message)
  }

  if (error.name === 'NotFoundError') {
    return new NotFoundError()
  }

  if (error.message?.includes('ECONNREFUSED') || error.code === 'ECONNREFUSED') {
    return new ServiceUnavailableError('Database connection failed')
  }

  if (error.code === 'ER_DUP_ENTRY') {
    return new ConflictError('Duplicate entry')
  }

  return new InternalError(error.message || 'Internal server error')
}

export function logError(error: AppError, context?: any) {
  console.error(`[${error.timestamp.toISOString()}] [${error.code}]`, {
    message: error.message,
    statusCode: error.statusCode,
    stack: error.stack,
    context,
  })
}
