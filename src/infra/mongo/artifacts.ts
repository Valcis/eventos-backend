import type { Db } from 'mongodb';

export async function ensureMongoArtifacts(db: Db): Promise<void> {
  // Collations for case-insensitive unique indexes
  const ci = { locale: 'en', strength: 2 } as const;

  await db.collection('events').createIndex({ date: 1 }, { name: 'idx_events_date' });
  await db.collection('events').createIndex({ name: 1 }, { name: 'uniq_events_name', unique: true, collation: ci });

  await db.collection('reservations').createIndex({ eventId: 1, createdAt: -1 }, { name: 'idx_reservations_eventId_createdAt' });
  await db.collection('reservations').createIndex({ eventId: 1, isPaid: 1, createdAt: -1 }, { name: 'idx_reservations_eventId_isPaid_createdAt' });
  await db.collection('reservations').createIndex({ eventId: 1, isDelivered: 1, createdAt: -1 }, { name: 'idx_reservations_eventId_isDelivered_createdAt' });
  await db.collection('reservations').createIndex({ salespersonId: 1, createdAt: -1 }, { name: 'idx_reservations_salespersonId_createdAt' });
  await db.collection('reservations').createIndex({ paymentMethodId: 1, createdAt: -1 }, { name: 'idx_reservations_paymentMethodId_createdAt' });
  await db.collection('reservations').createIndex({ cashierId: 1, createdAt: -1 }, { name: 'idx_reservations_cashierId_createdAt' });
  await db.collection('reservations').createIndex({ eventId: 1, reserver: 1 }, { name: 'uniq_reservations_eventId_reserver', unique: true, collation: ci } as any);

  await db.collection('products').createIndex({ eventId: 1 }, { name: 'idx_products_eventId' });
  await db.collection('products').createIndex({ eventId: 1, name: 1, supplement: 1 }, { name: 'uniq_products_eventId_name_supplement', unique: true, collation: ci } as any);

  await db.collection('promotions').createIndex({ eventId: 1, startDate: 1, endDate: 1 }, { name: 'idx_promotions_eventId_start_end' });
  await db.collection('promotions').createIndex({ eventId: 1, priority: -1 }, { name: 'idx_promotions_eventId_priority_desc' });

  await db.collection('expenses').createIndex({ eventId: 1, createdAt: -1 }, { name: 'idx_expenses_eventId_createdAt' });
  await db.collection('expenses').createIndex({ eventId: 1, isVerified: 1 }, { name: 'idx_expenses_eventId_isVerified' });
  await db.collection('expenses').createIndex({ payerId: 1, createdAt: -1 }, { name: 'idx_expenses_payerId_createdAt' });
  await db.collection('expenses').createIndex({ storeId: 1, createdAt: -1 }, { name: 'idx_expenses_storeId_createdAt' });

  const catalogs = ['units','salespeople','paymentmethods','cashiers','stores','consumptiontypes','payers','pickuppoints','partners'];
  for (const col of catalogs) {
    await db.collection(col).createIndex({ eventId: 1 }, { name: `idx_${col}_eventId` });
    await db.collection(col).createIndex({ eventId: 1, name: 1 }, { name: `uniq_${col}_eventId_name`, unique: true, collation: ci } as any);
  }
}
