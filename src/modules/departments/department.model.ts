import { Schema, model, Types, type HydratedDocument } from "mongoose";

export interface DepartmentAttrs {
  hospitalId: Types.ObjectId;
  name: string;
  headDoctorId: Types.ObjectId | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const departmentSchema = new Schema<DepartmentAttrs>(
  {
    hospitalId: {
      type: Schema.Types.ObjectId,
      ref: "Hospital",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    headDoctorId: { type: Schema.Types.ObjectId, ref: "Doctor", default: null },
    active: { type: Boolean, default: true, index: true },
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

departmentSchema.index({ hospitalId: 1, name: 1 }, { unique: true });

export type DepartmentDoc = HydratedDocument<DepartmentAttrs>;
export const Department = model<DepartmentAttrs>(
  "Department",
  departmentSchema,
);
