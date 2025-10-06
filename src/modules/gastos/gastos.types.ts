
import { ObjectId, Decimal128 } from "mongodb";
import { MoneyString } from "../../utils/currency";

export interface GastoDb {
  _id?: ObjectId;
  eventId: string;
  importe: Decimal128;
  descripcion?: string | null;
  proveedor?: string | null;
  comprobado: boolean;
  createdAt: Date;
  updatedAt?: Date;
}

export interface GastoDTO {
  id: string;
  eventId: string;
  importe: MoneyString;
  descripcion?: string | null;
  proveedor?: string | null;
  comprobado: boolean;
  createdAt: string; // ISO
  updatedAt?: string; // ISO
}
