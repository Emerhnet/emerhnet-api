import { Types } from "mongoose";
import { BloodStock } from "./bloodbank.model";
import type {
  CreateBloodStockInput,
  UpdateBloodStockInput,
} from "./bloodbank.schemas";
import { Conflict, NotFound } from "../../shared/errors";
import { writeAudit } from "../../shared/audit";

function hid(s: string) {
  return new Types.ObjectId(s);
}

export async function listBloodStock(hospitalId: string) {
  const docs = await BloodStock.find({ hospitalId: hid(hospitalId) })
    .sort({ bloodGroup: 1 })
    .exec();
  const items = docs.map((d) => d.toJSON());
  const totalUnits = items.reduce(
    (s, b) => s + (b.unitsAvailable as number),
    0,
  );
  const criticalCount = items.filter(
    (b) =>
      (b.unitsAvailable as number) <= (b.criticalThreshold as number) &&
      (b.unitsAvailable as number) > 0,
  ).length;
  const emptyCount = items.filter((b) => (b.unitsAvailable as number) === 0).length;
  return { items, totals: { totalUnits, criticalCount, emptyCount } };
}

export async function createBloodStock(
  hospitalId: string,
  input: CreateBloodStockInput,
  actorUserId: string,
) {
  const clash = await BloodStock.findOne({
    hospitalId: hid(hospitalId),
    bloodGroup: input.bloodGroup,
  }).lean();
  if (clash) throw Conflict(`Stock for ${input.bloodGroup} already exists`);

  const b = await BloodStock.create({
    hospitalId: hid(hospitalId),
    bloodGroup: input.bloodGroup,
    unitsAvailable: input.unitsAvailable ?? 0,
    criticalThreshold: input.criticalThreshold ?? 5,
    lastUpdatedByUserId: hid(actorUserId),
  });

  await writeAudit({
    actorUserId,
    actorRole: "hospitalAdmin",
    hospitalId,
    action: "bloodbank.created",
    entityType: "BloodStock",
    entityId: b.id,
    after: {
      bloodGroup: b.bloodGroup,
      unitsAvailable: b.unitsAvailable,
    },
  });

  return b.toJSON();
}

export async function updateBloodStock(
  hospitalId: string,
  id: string,
  input: UpdateBloodStockInput,
  actorUserId: string,
) {
  const b = await BloodStock.findOne({
    _id: hid(id),
    hospitalId: hid(hospitalId),
  });
  if (!b) throw NotFound("Blood stock entry not found");

  if (input.unitsAvailable !== undefined) b.unitsAvailable = input.unitsAvailable;
  if (input.criticalThreshold !== undefined)
    b.criticalThreshold = input.criticalThreshold;
  b.lastUpdatedByUserId = hid(actorUserId);
  await b.save();

  await writeAudit({
    actorUserId,
    actorRole: "hospitalAdmin",
    hospitalId,
    action: "bloodbank.updated",
    entityType: "BloodStock",
    entityId: b.id,
    after: {
      bloodGroup: b.bloodGroup,
      unitsAvailable: b.unitsAvailable,
      criticalThreshold: b.criticalThreshold,
    },
  });

  return b.toJSON();
}

export async function deleteBloodStock(
  hospitalId: string,
  id: string,
  actorUserId: string,
) {
  const b = await BloodStock.findOne({
    _id: hid(id),
    hospitalId: hid(hospitalId),
  });
  if (!b) throw NotFound("Blood stock entry not found");
  await b.deleteOne();

  await writeAudit({
    actorUserId,
    actorRole: "hospitalAdmin",
    hospitalId,
    action: "bloodbank.deleted",
    entityType: "BloodStock",
    entityId: id,
  });
}
