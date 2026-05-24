import { Schema, model, Types, type HydratedDocument } from "mongoose";

export type UserRole = "superAdmin" | "hospitalAdmin";
export type UserStatus = "active" | "locked" | "pendingPasswordSet";

export interface UserAttrs {
  email: string;
  passwordHash: string;
  fullName: string;
  role: UserRole;
  hospitalId: Types.ObjectId | null;
  status: UserStatus;
  mustChangePassword: boolean;
  failedLoginCount: number;
  lockedUntil: Date | null;
  lastLoginAt: Date | null;
  deactivatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<UserAttrs>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: { type: String, required: true, select: false },
    fullName: { type: String, required: true, trim: true },
    role: {
      type: String,
      enum: ["superAdmin", "hospitalAdmin"],
      required: true,
      index: true,
    },
    hospitalId: {
      type: Schema.Types.ObjectId,
      ref: "Hospital",
      default: null,
      index: true,
    },
    status: {
      type: String,
      enum: ["active", "locked", "pendingPasswordSet"],
      default: "active",
      index: true,
    },
    mustChangePassword: { type: Boolean, default: false },
    failedLoginCount: { type: Number, default: 0 },
    lockedUntil: { type: Date, default: null },
    lastLoginAt: { type: Date, default: null },
    deactivatedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        const out = ret as Record<string, unknown>;
        out.id = String(out._id);
        delete out._id;
        delete out.__v;
        delete out.passwordHash;
        return out;
      },
    },
  },
);

userSchema.index({ hospitalId: 1, role: 1 });

export type UserDoc = HydratedDocument<UserAttrs>;
export const User = model<UserAttrs>("User", userSchema);
