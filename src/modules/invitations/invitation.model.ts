import { Schema, model, Types, type HydratedDocument } from 'mongoose';

export type InvitationStatus =
  | 'sent'
  | 'opened'
  | 'submitted'
  | 'approved'
  | 'expired'
  | 'cancelled';

export interface InvitationAttrs {
  recipientEmail: string;
  hospitalName: string;
  recipientRole: string;
  internalNotes: string;
  verificationNotes: string;
  tokenHash: string;
  status: InvitationStatus;
  expiresAt: Date;
  sentByUserId: Types.ObjectId;
  openedAt: Date | null;
  submittedAt: Date | null;
  approvedAt: Date | null;
  cancelledAt: Date | null;
  hospitalId: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const invitationSchema = new Schema<InvitationAttrs>(
  {
    recipientEmail: { type: String, required: true, lowercase: true, trim: true, index: true },
    hospitalName: { type: String, required: true, trim: true },
    recipientRole: { type: String, default: '', trim: true },
    internalNotes: { type: String, default: '' },
    verificationNotes: { type: String, default: '' },
    tokenHash: { type: String, required: true, unique: true, index: true },
    status: {
      type: String,
      enum: ['sent', 'opened', 'submitted', 'approved', 'expired', 'cancelled'],
      default: 'sent',
      index: true,
    },
    expiresAt: { type: Date, required: true },
    sentByUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    openedAt: { type: Date, default: null },
    submittedAt: { type: Date, default: null },
    approvedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    hospitalId: { type: Schema.Types.ObjectId, ref: 'Hospital', default: null, index: true },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        const out = ret as Record<string, unknown>;
        out.id = String(out._id);
        delete out._id;
        delete out.__v;
        delete out.tokenHash;
        return out;
      },
    },
  },
);

invitationSchema.index({ createdAt: -1 });

export type InvitationDoc = HydratedDocument<InvitationAttrs>;
export const Invitation = model<InvitationAttrs>('Invitation', invitationSchema);
