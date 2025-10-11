// === Índices y unicidades para Eventos (MongoDB) ===
const ci = { collation: { locale: "en", strength: 2 } }; // case-insensitive

// === EVENTS ===
db.events.createIndex({ date: 1 }, { name: "idx_events_date" });
db.events.createIndex({ name: 1 }, { unique: true, ...ci, name: "uniq_events_name" });

// === RESERVATIONS ===
db.reservations.createIndex({ eventId: 1, createdAt: -1 }, { name: "idx_reservations_eventId_createdAt" });
db.reservations.createIndex({ eventId: 1, isPaid: 1, createdAt: -1 }, { name: "idx_reservations_eventId_isPaid_createdAt" });
db.reservations.createIndex({ eventId: 1, isDelivered: 1, createdAt: -1 }, { name: "idx_reservations_eventId_isDelivered_createdAt" });
db.reservations.createIndex({ salespersonId: 1, createdAt: -1 }, { name: "idx_reservations_salespersonId_createdAt" });
db.reservations.createIndex({ paymentMethodId: 1, createdAt: -1 }, { name: "idx_reservations_paymentMethodId_createdAt" });
db.reservations.createIndex({ cashierId: 1, createdAt: -1 }, { name: "idx_reservations_cashierId_createdAt" });
db.reservations.createIndex({ eventId: 1, reserver: 1 }, { unique: true, ...ci, name: "uniq_reservations_eventId_reserver" });

// === PRODUCTS ===
db.products.createIndex({ eventId: 1 }, { name: "idx_products_eventId" });
db.products.createIndex({ eventId: 1, name: 1, supplement: 1 }, { unique: true, ...ci, name: "uniq_products_eventId_name_supplement" });

// === PROMOTIONS ===
db.promotions.createIndex({ eventId: 1, startDate: 1, endDate: 1 }, { name: "idx_promotions_eventId_start_end" });
db.promotions.createIndex({ eventId: 1, priority: -1 }, { name: "idx_promotions_eventId_priority_desc" });

// === EXPENSES ===
db.expenses.createIndex({ eventId: 1, createdAt: -1 }, { name: "idx_expenses_eventId_createdAt" });
db.expenses.createIndex({ eventId: 1, isVerified: 1 }, { name: "idx_expenses_eventId_isVerified" });
db.expenses.createIndex({ payerId: 1, createdAt: -1 }, { name: "idx_expenses_payerId_createdAt" });
db.expenses.createIndex({ storeId: 1, createdAt: -1 }, { name: "idx_expenses_storeId_createdAt" });

// === UNITS ===
db.units.createIndex({ eventId: 1 }, { name: "idx_units_eventId" });
db.units.createIndex({ eventId: 1, name: 1 }, { unique: true, ...ci, name: "uniq_units_eventId_name" });

// === SALESPEOPLE ===
db.salespeople.createIndex({ eventId: 1 }, { name: "idx_salespeople_eventId" });
db.salespeople.createIndex({ eventId: 1, name: 1 }, { unique: true, ...ci, name: "uniq_salespeople_eventId_name" });

// === PAYMENT METHODS ===
db.paymentmethods.createIndex({ eventId: 1 }, { name: "idx_paymentmethods_eventId" });
db.paymentmethods.createIndex({ eventId: 1, name: 1 }, { unique: true, ...ci, name: "uniq_paymentmethods_eventId_name" });

// === CASHIERS ===
db.cashiers.createIndex({ eventId: 1 }, { name: "idx_cashiers_eventId" });
db.cashiers.createIndex({ eventId: 1, name: 1 }, { unique: true, ...ci, name: "uniq_cashiers_eventId_name" });

// === STORES ===
db.stores.createIndex({ eventId: 1 }, { name: "idx_stores_eventId" });
db.stores.createIndex({ eventId: 1, name: 1 }, { unique: true, ...ci, name: "uniq_stores_eventId_name" });

// === CONSUMPTION TYPES ===
db.consumptiontypes.createIndex({ eventId: 1 }, { name: "idx_consumptiontypes_eventId" });
db.consumptiontypes.createIndex({ eventId: 1, name: 1 }, { unique: true, ...ci, name: "uniq_consumptiontypes_eventId_name" });

// === PAYERS ===
db.payers.createIndex({ eventId: 1 }, { name: "idx_payers_eventId" });
db.payers.createIndex({ eventId: 1, name: 1 }, { unique: true, ...ci, name: "uniq_payers_eventId_name" });

// === PICKUP POINTS ===
db.pickuppoints.createIndex({ eventId: 1 }, { name: "idx_pickuppoints_eventId" });
db.pickuppoints.createIndex({ eventId: 1, name: 1 }, { unique: true, ...ci, name: "uniq_pickuppoints_eventId_name" });

// === PARTNERS ===
db.partners.createIndex({ eventId: 1 }, { name: "idx_partners_eventId" });
db.partners.createIndex({ eventId: 1, name: 1 }, { unique: true, ...ci, name: "uniq_partners_eventId_name" });

print("Índices creados (o existentes) con éxito.");
