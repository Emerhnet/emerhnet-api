import { z } from 'zod';

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat',
  'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh',
  'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand',
  'West Bengal', 'Andaman and Nicobar Islands', 'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir', 'Ladakh',
  'Lakshadweep', 'Puducherry',
] as const;

const DOCUMENT_SLOT_KEYS = [
  'hospitalRegistrationCertificate', 'ceaLicence', 'authorisationLetter',
  'governmentOrder', 'nabhAccreditation', 'panOfEntity',
] as const;

const phoneRegex = /^[+\d][\d\s-]{7,20}$/;
const latRegex = /^-?(90(\.0+)?|[0-8]?\d(\.\d+)?)$/;
const lngRegex = /^-?(180(\.0+)?|1[0-7]\d(\.\d+)?|\d{1,2}(\.\d+)?)$/;

export const registerHospitalSchema = z.object({
  hospitalName: z.string().min(2),
  nin: z.string().regex(/^\d{10}$/, 'NIN must be 10 digits'),
  ceaLicenceNumber: z.string().optional().default(''),
  category: z.enum(['Government', 'Private', 'Trust']),
  cghsEmpanelment: z.enum(['Yes', 'No']),
  ayushmanEmpanelment: z.enum(['Yes', 'No']),
  address: z.object({
    line1: z.string().min(2),
    line2: z.string().optional().default(''),
    city: z.string().min(1),
    state: z.enum(INDIAN_STATES),
    pincode: z.string().regex(/^\d{6}$/),
    latitude: z.string().regex(latRegex, 'Invalid latitude'),
    longitude: z.string().regex(lngRegex, 'Invalid longitude'),
  }),
  contact: z.object({
    email: z.string().email().toLowerCase(),
    phone: z.string().regex(phoneRegex),
  }),
  adminContact: z.object({
    name: z.string().min(2),
    email: z.string().email().toLowerCase(),
    phone: z.string().regex(phoneRegex),
  }),
  documents: z
    .array(
      z.object({
        slotKey: z.enum(DOCUMENT_SLOT_KEYS),
        fileName: z.string().min(1),
        sizeBytes: z.number().int().positive(),
        s3Key: z.string().min(1),
      }),
    )
    .optional()
    .default([]),
  inviteToken: z.string().optional(),
});

export type RegisterHospitalInput = z.infer<typeof registerHospitalSchema>;

export const reviewHospitalSchema = z.object({
  notes: z.string().optional().default(''),
});

export const updateMyHospitalSchema = z.object({
  contact: z
    .object({
      email: z.string().email().toLowerCase(),
      phone: z.string().regex(phoneRegex),
    })
    .partial()
    .optional(),
  visitingHours: z.string().max(200).optional(),
  description: z.string().max(2000).optional(),
  address: z
    .object({
      line1: z.string().min(2),
      line2: z.string().optional(),
      city: z.string().min(1),
      pincode: z.string().regex(/^\d{6}$/),
    })
    .partial()
    .optional(),
});
export type UpdateMyHospitalInput = z.infer<typeof updateMyHospitalSchema>;

export const addPhotoSchema = z.object({
  s3Key: z.string().min(1),
  fileName: z.string().min(1),
  sizeBytes: z.number().int().positive(),
});
export type AddPhotoInput = z.infer<typeof addPhotoSchema>;

export const listHospitalsSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'suspended']).optional(),
  category: z.enum(['Government', 'Private', 'Trust']).optional(),
  state: z.string().optional(),
  cghs: z.coerce.boolean().optional(),
  ayushman: z.coerce.boolean().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(100),
});
