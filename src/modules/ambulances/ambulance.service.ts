import { Types } from 'mongoose';
import { Ambulance } from './ambulance.model';
import type {
  CreateAmbulanceInput,
  UpdateAmbulanceInput,
} from './ambulance.schemas';
import { Conflict, NotFound } from '../../shared/errors';
import { writeAudit } from '../../shared/audit';

function hid(s: string) {
  return new Types.ObjectId(s);
}

export async function listAmbulances(
  hospitalId: string,
  opts: { search?: string; type?: string; status?: string },
) {
  const filter: Record<string, unknown> = { hospitalId: hid(hospitalId) };
  if (opts.type) filter.type = opts.type;
  if (opts.status) filter.status = opts.status;
  if (opts.search) {
    const re = new RegExp(opts.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ vehicleNumber: re }, { driverName: re }];
  }

  const docs = await Ambulance.find(filter).sort({ vehicleNumber: 1 }).exec();
  return { items: docs.map((d) => d.toJSON()), total: docs.length };
}

export async function createAmbulance(
  hospitalId: string,
  input: CreateAmbulanceInput,
  actorUserId: string,
) {
  const clash = await Ambulance.findOne({
    hospitalId: hid(hospitalId),
    vehicleNumber: input.vehicleNumber,
  }).lean();
  if (clash) throw Conflict('An ambulance with this vehicle number already exists');

  const a = await Ambulance.create({
    hospitalId: hid(hospitalId),
    vehicleNumber: input.vehicleNumber,
    type: input.type,
    driverName: input.driverName,
    driverPhone: input.driverPhone,
    equipment: input.equipment ?? [],
    status: input.status ?? 'Available',
  });

  await writeAudit({
    actorUserId,
    actorRole: 'hospitalAdmin',
    hospitalId,
    action: 'ambulance.created',
    entityType: 'Ambulance',
    entityId: a.id,
    after: { vehicleNumber: a.vehicleNumber, type: a.type },
  });

  return a.toJSON();
}

export async function updateAmbulance(
  hospitalId: string,
  id: string,
  input: UpdateAmbulanceInput,
  actorUserId: string,
) {
  const a = await Ambulance.findOne({ _id: hid(id), hospitalId: hid(hospitalId) });
  if (!a) throw NotFound('Ambulance not found');

  if (input.vehicleNumber !== undefined && input.vehicleNumber !== a.vehicleNumber) {
    const clash = await Ambulance.findOne({
      hospitalId: hid(hospitalId),
      vehicleNumber: input.vehicleNumber,
      _id: { $ne: a._id },
    }).lean();
    if (clash) throw Conflict('An ambulance with this vehicle number already exists');
    a.vehicleNumber = input.vehicleNumber;
  }
  if (input.type !== undefined) a.type = input.type;
  if (input.driverName !== undefined) a.driverName = input.driverName;
  if (input.driverPhone !== undefined) a.driverPhone = input.driverPhone;
  if (input.equipment !== undefined) a.equipment = input.equipment;
  if (input.status !== undefined) a.status = input.status;
  await a.save();

  await writeAudit({
    actorUserId,
    actorRole: 'hospitalAdmin',
    hospitalId,
    action: 'ambulance.updated',
    entityType: 'Ambulance',
    entityId: a.id,
  });

  return a.toJSON();
}

export async function deleteAmbulance(hospitalId: string, id: string, actorUserId: string) {
  const a = await Ambulance.findOne({ _id: hid(id), hospitalId: hid(hospitalId) });
  if (!a) throw NotFound('Ambulance not found');
  await a.deleteOne();

  await writeAudit({
    actorUserId,
    actorRole: 'hospitalAdmin',
    hospitalId,
    action: 'ambulance.deleted',
    entityType: 'Ambulance',
    entityId: id,
  });
}
