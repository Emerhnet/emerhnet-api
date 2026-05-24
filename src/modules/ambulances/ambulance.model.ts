import { Schema, model, Types, type HydratedDocument } from "mongoose";

export type AmbulanceType =
  | "BLS"
  | "ALS"
  | "ICU"
  | "Neonatal"
  | "Patient Transport";
export type AmbulanceStatus =
  | "Available"
  | "On Duty"
  | "Under Maintenance"
  | "Out of Service";

export interface AmbulanceAttrs {
  hospitalId: Types.ObjectId;
  vehicleNumber: string;
  type: AmbulanceType;
  driverName: string;
  driverPhone: string;
  equipment: string[];
  status: AmbulanceStatus;
  createdAt: Date;
  updatedAt: Date;
}

const ambulanceSchema = new Schema<AmbulanceAttrs>(
  {
    hospitalId: {
      type: Schema.Types.ObjectId,
      ref: "Hospital",
      required: true,
      index: true,
    },
    vehicleNumber: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ["BLS", "ALS", "ICU", "Neonatal", "Patient Transport"],
      required: true,
    },
    driverName: { type: String, required: true, trim: true },
    driverPhone: { type: String, required: true, trim: true },
    equipment: { type: [String], default: [] },
    status: {
      type: String,
      enum: ["Available", "On Duty", "Under Maintenance", "Out of Service"],
      default: "Available",
      index: true,
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

ambulanceSchema.index({ hospitalId: 1, vehicleNumber: 1 }, { unique: true });

export type AmbulanceDoc = HydratedDocument<AmbulanceAttrs>;
export const Ambulance = model<AmbulanceAttrs>("Ambulance", ambulanceSchema);
