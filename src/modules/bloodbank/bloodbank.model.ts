import { Schema, model, Types, type HydratedDocument } from "mongoose";

export const BLOOD_GROUPS = [
  "A+",
  "A-",
  "B+",
  "B-",
  "AB+",
  "AB-",
  "O+",
  "O-",
] as const;
export type BloodGroup = (typeof BLOOD_GROUPS)[number];

export interface BloodStockAttrs {
  hospitalId: Types.ObjectId;
  bloodGroup: BloodGroup;
  unitsAvailable: number;
  criticalThreshold: number;
  lastUpdatedByUserId: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const bloodStockSchema = new Schema<BloodStockAttrs>(
  {
    hospitalId: {
      type: Schema.Types.ObjectId,
      ref: "Hospital",
      required: true,
      index: true,
    },
    bloodGroup: {
      type: String,
      enum: BLOOD_GROUPS,
      required: true,
    },
    unitsAvailable: { type: Number, required: true, min: 0, default: 0 },
    criticalThreshold: { type: Number, required: true, min: 0, default: 5 },
    lastUpdatedByUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
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

bloodStockSchema.index({ hospitalId: 1, bloodGroup: 1 }, { unique: true });

export type BloodStockDoc = HydratedDocument<BloodStockAttrs>;
export const BloodStock = model<BloodStockAttrs>("BloodStock", bloodStockSchema);
