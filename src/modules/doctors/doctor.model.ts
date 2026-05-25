import { Schema, model, Types, type HydratedDocument } from "mongoose";

export type Gender = "Male" | "Female" | "Other" | "Prefer not to say";
export type DutyStatus = "active" | "on_leave" | "off_duty";
export type DayKey = "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";

export interface ScheduleSlot {
  from: string;
  to: string;
}
export interface DaySchedule {
  off: boolean;
  slots: ScheduleSlot[];
}
export type ConsultationSchedule = Record<DayKey, DaySchedule>;

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
  opdRoom: string;
  photoS3Key: string | null;
  dutyStatus: DutyStatus;
  consultationSchedule: ConsultationSchedule | null;
  deactivatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const slotSchema = new Schema<ScheduleSlot>(
  { from: { type: String, required: true }, to: { type: String, required: true } },
  { _id: false },
);
const daySchema = new Schema<DaySchedule>(
  { off: { type: Boolean, default: false }, slots: { type: [slotSchema], default: [] } },
  { _id: false },
);

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
    opdRoom: { type: String, default: "" },
    photoS3Key: { type: String, default: null },
    dutyStatus: {
      type: String,
      enum: ["active", "on_leave", "off_duty"],
      default: "active",
      index: true,
    },
    consultationSchedule: {
      type: {
        Mon: { type: daySchema, default: () => ({ off: false, slots: [] }) },
        Tue: { type: daySchema, default: () => ({ off: false, slots: [] }) },
        Wed: { type: daySchema, default: () => ({ off: false, slots: [] }) },
        Thu: { type: daySchema, default: () => ({ off: false, slots: [] }) },
        Fri: { type: daySchema, default: () => ({ off: false, slots: [] }) },
        Sat: { type: daySchema, default: () => ({ off: false, slots: [] }) },
        Sun: { type: daySchema, default: () => ({ off: true, slots: [] }) },
      },
      default: null,
    },
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
