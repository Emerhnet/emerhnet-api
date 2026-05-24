import { Types } from 'mongoose';
import { Bed } from './bed.model';
import type { CreateBedInput, UpdateBedInput } from './bed.schemas';
import { Conflict, NotFound, ValidationError } from '../../shared/errors';
import { writeAudit } from '../../shared/audit';

function hid(s: string) {
  return new Types.ObjectId(s);
}

export async function listBeds(hospitalId: string) {
  const docs = await Bed.find({ hospitalId: hid(hospitalId) }).sort({ type: 1 }).exec();
  const items = docs.map((d) => d.toJSON());
  const totals = items.reduce(
    (acc, b) => {
      acc.total += b.total as number;
      acc.occupied += b.occupied as number;
      return acc;
    },
    { total: 0, occupied: 0 },
  );
  return { items, totals };
}

export async function createBed(hospitalId: string, input: CreateBedInput, actorUserId: string) {
  if (input.occupied > input.total) {
    throw ValidationError('Occupied cannot exceed total');
  }
  const clash = await Bed.findOne({ hospitalId: hid(hospitalId), type: input.type }).lean();
  if (clash) throw Conflict('A bed type with this name already exists');

  const b = await Bed.create({
    hospitalId: hid(hospitalId),
    type: input.type,
    total: input.total,
    occupied: input.occupied ?? 0,
    lastUpdatedByUserId: hid(actorUserId),
  });

  await writeAudit({
    actorUserId,
    actorRole: 'hospitalAdmin',
    hospitalId,
    action: 'bed.created',
    entityType: 'Bed',
    entityId: b.id,
    after: { type: b.type, total: b.total, occupied: b.occupied },
  });

  return b.toJSON();
}

export async function updateBed(
  hospitalId: string,
  id: string,
  input: UpdateBedInput,
  actorUserId: string,
) {
  const b = await Bed.findOne({ _id: hid(id), hospitalId: hid(hospitalId) });
  if (!b) throw NotFound('Bed not found');

  if (input.type !== undefined && input.type !== b.type) {
    const clash = await Bed.findOne({
      hospitalId: hid(hospitalId),
      type: input.type,
      _id: { $ne: b._id },
    }).lean();
    if (clash) throw Conflict('A bed type with this name already exists');
    b.type = input.type;
  }
  if (input.total !== undefined) b.total = input.total;
  if (input.occupied !== undefined) b.occupied = input.occupied;
  if (b.occupied > b.total) throw ValidationError('Occupied cannot exceed total');
  b.lastUpdatedByUserId = hid(actorUserId);
  await b.save();

  await writeAudit({
    actorUserId,
    actorRole: 'hospitalAdmin',
    hospitalId,
    action: 'bed.updated',
    entityType: 'Bed',
    entityId: b.id,
    after: { total: b.total, occupied: b.occupied },
  });

  return b.toJSON();
}

export async function deleteBed(hospitalId: string, id: string, actorUserId: string) {
  const b = await Bed.findOne({ _id: hid(id), hospitalId: hid(hospitalId) });
  if (!b) throw NotFound('Bed not found');
  await b.deleteOne();

  await writeAudit({
    actorUserId,
    actorRole: 'hospitalAdmin',
    hospitalId,
    action: 'bed.deleted',
    entityType: 'Bed',
    entityId: id,
  });
}
