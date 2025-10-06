
import { ObjectId } from "mongodb";

export type ReservaEstado = "pendiente" | "confirmada" | "cancelada";

export interface ReservaDb {
  _id?: ObjectId;
  eventId: string;
  estado: ReservaEstado;
  createdAt: Date;
  updatedAt?: Date;
}

export interface ReservaDTO {
  id: string;
  eventId: string;
  estado: ReservaEstado;
  createdAt: string; // ISO
  updatedAt?: string; // ISO
}
