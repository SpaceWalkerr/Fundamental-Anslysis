import * as z from 'zod';

// Login form validation schema
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email address'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(8, 'Password must be at least 8 characters'),
});

export type LoginFormData = z.infer<typeof loginSchema>;

// Register form validation schema
export const registerSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .min(2, 'Name must be at least 2 characters'),
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email address'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
  confirmPassword: z
    .string()
    .min(1, 'Please confirm your password'),
  acceptTerms: z
    .boolean()
    .refine((val) => val === true, {
      message: 'You must accept the terms and conditions',
    }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export type RegisterFormData = z.infer<typeof registerSchema>;

// Profile update schema
export const profileUpdateSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .optional(),
  email: z
    .string()
    .email('Invalid email address')
    .optional(),
  currentPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .optional(),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    )
    .optional(),
});

export type ProfileUpdateFormData = z.infer<typeof profileUpdateSchema>;

// Stock filter schema
export const stockFilterSchema = z.object({
  field: z.string().min(1, 'Field is required'),
  operator: z.enum(['gt', 'gte', 'lt', 'lte', 'eq']),
  value: z.string().min(1, 'Value is required'),
});

export type StockFilterData = z.infer<typeof stockFilterSchema>;

// File upload schema
export const fileUploadSchema = z.object({
  file: z
    .any()
    .refine((file) => file instanceof File, 'File is required')
    .refine(
      (file) => file.size <= 10 * 1024 * 1024,
      'File size must be less than 10MB'
    )
    .refine(
      (file) => {
        const validTypes = [
          'application/pdf',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'text/csv',
        ];
        return validTypes.includes(file.type);
      },
      'File must be PDF, Excel, or CSV'
    ),
});

export type FileUploadData = z.infer<typeof fileUploadSchema>;

// Company search schema
export const companySearchSchema = z.object({
  query: z
    .string()
    .min(1, 'Search query is required')
    .min(2, 'Query must be at least 2 characters'),
});

export type CompanySearchData = z.infer<typeof companySearchSchema>;
