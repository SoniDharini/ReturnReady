import { z } from 'zod';
import { ApiError } from '../utils/ApiError.js';

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[a-z]/, 'Password must include a lowercase letter')
  .regex(/[A-Z]/, 'Password must include an uppercase letter')
  .regex(/[0-9]/, 'Password must include a number');

export const registerSchema = z.object({
  name: z
    .string({ required_error: 'Name is required' })
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(80, 'Name must be at most 80 characters'),
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .email('Please provide a valid email address')
    .transform((value) => value.toLowerCase()),
  phone: z
    .string()
    .trim()
    .optional()
    .or(z.literal(''))
    .refine((value) => !value || /^[0-9+\-\s()]{7,20}$/.test(value), {
      message: 'Please provide a valid phone number',
    }),
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .email('Please provide a valid email address')
    .transform((value) => value.toLowerCase()),
  password: z.string({ required_error: 'Password is required' }).min(1, 'Password is required'),
});

function formatZodErrors(error) {
  const errors = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || 'form';
    if (!errors[key]) {
      errors[key] = issue.message;
    }
  }
  return errors;
}

export function validateBody(schema) {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      return next(
        new ApiError(400, 'Validation failed', formatZodErrors(result.error)),
      );
    }

    req.body = result.data;
    return next();
  };
}
