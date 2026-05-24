import { Schema, model, Types, type HydratedDocument } from 'mongoose';

export interface PasswordResetAttrs {
  userId: Types.ObjectId;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const passwordResetSchema = new Schema<PasswordResetAttrs>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true, index: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

passwordResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type PasswordResetDoc = HydratedDocument<PasswordResetAttrs>;
export const PasswordReset = model<PasswordResetAttrs>('PasswordReset', passwordResetSchema);
