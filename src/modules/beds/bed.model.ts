import { Schema, model, Types, type HydratedDocument } from 'mongoose';

export interface BedAttrs {
  hospitalId: Types.ObjectId;
  type: string;
  total: number;
  occupied: number;
  lastUpdatedByUserId: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const bedSchema = new Schema<BedAttrs>(
  {
    hospitalId: { type: Schema.Types.ObjectId, ref: 'Hospital', required: true, index: true },
    type: { type: String, required: true, trim: true },
    total: { type: Number, required: true, min: 0 },
    occupied: { type: Number, required: true, min: 0, default: 0 },
    lastUpdatedByUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        const out = ret as Record<string, unknown>;
        out.id = String(out._id);
        delete out._id;
        delete out.__v;
        return out;
      },
    },
  },
);

bedSchema.index({ hospitalId: 1, type: 1 }, { unique: true });

export type BedDoc = HydratedDocument<BedAttrs>;
export const Bed = model<BedAttrs>('Bed', bedSchema);
