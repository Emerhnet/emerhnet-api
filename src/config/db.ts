import mongoose from "mongoose";
import { env } from "./env";
import { logger } from "../shared/logger";

export async function connectDb(): Promise<void> {
  if(!env) return;
  mongoose.set("strictQuery", true);
  await mongoose.connect(env.MONGO_URI, {
    autoIndex: env.NODE_ENV !== "production",
  });
  logger.info({ uri: redact(env.MONGO_URI) }, "mongo connected");
}

export async function disconnectDb(): Promise<void> {
  await mongoose.disconnect();
}

function redact(uri: string): string {
  return uri.replace(/\/\/([^:]+):([^@]+)@/, "//$1:***@");
}
