
import { Decimal128, ObjectId } from "mongodb";
import { MoneyString } from "../../utils/currency";

export interface PrecioDb {
  _id?: ObjectId;
  eventId: string;
  productoId: string;
  precio: Decimal128; // Decimal128 en BBDD
  createdAt: Date;
  updatedAt?: Date;
}

export interface PrecioDTO {
  id: string;
  eventId: string;
  productoId: string;
  precio: MoneyString; // string decimal en API
  createdAt: string;   // ISO
  updatedAt?: string;  // ISO
}
