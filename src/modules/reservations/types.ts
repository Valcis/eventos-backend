// Dominio expuesto en API
export interface Reservation {
    id: string;
    userId: string;
    eventId: string;
    seats: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

// Payloads
export type ReservationCreate = {
    userId: string;
    eventId: string;
    seats: number;
};

export type ReservationUpdate = Partial<ReservationCreate>;

// Filtros de listado
export type ReservationQuery = {
    userId?: string;
    eventId?: string;
    isActive?: boolean;
};
