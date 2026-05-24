import { Schema, model, type HydratedDocument } from "mongoose";

export type HospitalStatus = "pending" | "approved" | "rejected" | "suspended";
export type HospitalCategory = "Government" | "Private" | "Trust";
export type DocumentSlotKey =
  | "hospitalRegistrationCertificate"
  | "ceaLicence"
  | "authorisationLetter"
  | "governmentOrder"
  | "nabhAccreditation"
  | "panOfEntity";

export interface HospitalAttrs {
  trackingId: string;
  hospitalName: string;
  nin: string;
  ceaLicenceNumber: string;
  category: HospitalCategory;
  cghsEmpanelment: boolean;
  ayushmanEmpanelment: boolean;
  address: {
    line1: string;
    line2: string;
    city: string;
    state: string;
    pincode: string;
    latitude: number;
    longitude: number;
  };
  contact: { email: string; phone: string };
  adminContact: { name: string; email: string; phone: string };
  documents: Array<{
    slotKey: DocumentSlotKey;
    fileName: string;
    sizeBytes: number;
    s3Key: string;
  }>;
  photos: Array<{
    s3Key: string;
    fileName: string;
    sizeBytes: number;
    uploadedAt: Date;
  }>;
  visitingHours: string;
  description: string;
  status: HospitalStatus;
  reviewNotes: string;
  approvedAt: Date | null;
  rejectedAt: Date | null;
  suspendedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const hospitalSchema = new Schema<HospitalAttrs>(
  {
    trackingId: { type: String, required: true, unique: true, index: true },
    hospitalName: { type: String, required: true, trim: true },
    nin: { type: String, required: true, unique: true, index: true },
    ceaLicenceNumber: { type: String, default: "" },
    category: {
      type: String,
      enum: ["Government", "Private", "Trust"],
      required: true,
    },
    cghsEmpanelment: { type: Boolean, required: true },
    ayushmanEmpanelment: { type: Boolean, required: true },
    address: {
      line1: { type: String, required: true },
      line2: { type: String, default: "" },
      city: { type: String, required: true },
      state: { type: String, required: true },
      pincode: { type: String, required: true },
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
    },
    contact: {
      email: { type: String, required: true, lowercase: true, trim: true },
      phone: { type: String, required: true },
    },
    adminContact: {
      name: { type: String, required: true },
      email: { type: String, required: true, lowercase: true, trim: true },
      phone: { type: String, required: true },
    },
    documents: [
      {
        slotKey: { type: String, required: true },
        fileName: { type: String, required: true },
        sizeBytes: { type: Number, required: true },
        s3Key: { type: String, required: true },
      },
    ],
    photos: {
      type: [
        {
          s3Key: { type: String, required: true },
          fileName: { type: String, required: true },
          sizeBytes: { type: Number, required: true },
          uploadedAt: { type: Date, default: () => new Date() },
        },
      ],
      default: [],
    },
    visitingHours: { type: String, default: "" },
    description: { type: String, default: "" },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "suspended"],
      default: "pending",
      index: true,
    },
    reviewNotes: { type: String, default: "" },
    approvedAt: { type: Date, default: null },
    rejectedAt: { type: Date, default: null },
    suspendedAt: { type: Date, default: null },
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

hospitalSchema.index({ status: 1, createdAt: -1 });
hospitalSchema.index({ "adminContact.email": 1 });

export type HospitalDoc = HydratedDocument<HospitalAttrs>;
export const Hospital = model<HospitalAttrs>("Hospital", hospitalSchema);
