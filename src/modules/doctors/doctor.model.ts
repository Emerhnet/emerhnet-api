import { Schema, model, Types, type HydratedDocument } from "mongoose";

export type Gender = "Male" | "Female" | "Other" | "Prefer not to say";

export interface DoctorAttrs {
  hospitalId: Types.ObjectId;
  fullName: string;
  councilReg: string;
  council: string;
  departmentId: Types.ObjectId;
  specialisation: string;
  qualifications: string[];
  email: string;
  phone: string;
  gender: Gender;
  dob: Date | null;
  joinedAt: Date;
  deactivatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const doctorSchema = new Schema<DoctorAttrs>(
  {
    hospitalId: {
      type: Schema.Types.ObjectId,
      ref: "Hospital",
      required: true,
      index: true,
    },
    fullName: { type: String, required: true, trim: true },
    councilReg: { type: String, required: true, trim: true },
    council: { type: String, required: true, trim: true },
    departmentId: {
      type: Schema.Types.ObjectId,
      ref: "Department",
      required: true,
      index: true,
    },
    specialisation: { type: String, default: "", trim: true },
    qualifications: { type: [String], default: [] },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    gender: {
      type: String,
      enum: ["Male", "Female", "Other", "Prefer not to say"],
      required: true,
    },
    dob: { type: Date, default: null },
    joinedAt: { type: Date, required: true },
    deactivatedAt: { type: Date, default: null, index: true },
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

doctorSchema.index({ hospitalId: 1, councilReg: 1 }, { unique: true });
doctorSchema.index({ hospitalId: 1, fullName: 1 });

export type DoctorDoc = HydratedDocument<DoctorAttrs>;
export const Doctor = model<DoctorAttrs>("Doctor", doctorSchema);
