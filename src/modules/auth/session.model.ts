import { Schema, model, Types, type HydratedDocument } from 'mongoose';

export interface SessionAttrs {
  userId: Types.ObjectId;
  tokenId: string;
  userAgent?: string;
  ip?: string;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const sessionSchema = new Schema<SessionAttrs>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenId: { type: String, required: true, unique: true, index: true },
    userAgent: String,
    ip: String,
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type SessionDoc = HydratedDocument<SessionAttrs>;
export const Session = model<SessionAttrs>('Session', sessionSchema);
