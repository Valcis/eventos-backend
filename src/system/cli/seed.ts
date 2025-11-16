import { ObjectId } from 'mongodb';
import { connectMongo, closeMongo, getDb } from '../../infra/mongo/client';

async function run(): Promise<void> {
	await connectMongo();
	const database = getDb();

	const now = new Date();

	// Limpiar colecciones existentes (opcional - comentar si no se desea)
	console.log('Limpiando colecciones...');
	const collections = [
		'events',
		'reservations',
		'products',
		'promotions',
		'expenses',
		'salespeople',
		'payment_methods',
		'cashiers',
		'stores',
		'units',
		'consumption_types',
		'payers',
		'pickup_points',
		'partners',
		'usuarios', // Nueva colección de usuarios
	];
	for (const collectionName of collections) {
		await database.collection(collectionName).deleteMany({});
	}

	// ==================== USERS ====================
	console.log('Creando usuarios...');
	const bcrypt = await import('bcrypt');
	const passwordHash = await bcrypt.hash('password123', 10);

	const userResult = await database.collection('usuarios').insertMany([
		{
			_id: new ObjectId(),
			email: 'admin@example.com',
			passwordHash,
			name: 'Administrador',
			role: 'admin',
			provider: 'local',
			emailVerified: true,
			isActive: true,
			createdAt: now,
			updatedAt: now,
		},
		{
			_id: new ObjectId(),
			email: 'user@example.com',
			passwordHash,
			name: 'Usuario Regular',
			role: 'user',
			provider: 'local',
			emailVerified: true,
			isActive: true,
			createdAt: now,
			updatedAt: now,
		},
	]);
	const userId = userResult.insertedIds[0];
	console.log(`Usuarios creados: ${userResult.insertedCount}`);

	// ==================== EVENTS ====================
	console.log('Creando evento...');
	const eventId = new ObjectId();
	await database.collection('events').insertOne({
		_id: eventId,
		name: 'Fiesta de la Parrillada 2025',
		date: new Date('2025-06-15T12:00:00.000Z'),
		capacity: 200,
		capitalAmount: '5000.00',
		isActive: true,
		createdAt: now,
		updatedAt: now,
	});
	console.log(`Evento creado: ${eventId.toString()}`);

	// ==================== SALESPEOPLE ====================
	console.log('Creando vendedores...');
	const salespersonId = new ObjectId();
	await database.collection('salespeople').insertMany([
		{
			_id: salespersonId,
			eventId,
			name: 'Laura García',
			phone: '+34600111222',
			notes: 'Vendedora principal',
			isActive: true,
			createdAt: now,
			updatedAt: now,
		},
		{
			_id: new ObjectId(),
			eventId,
			name: 'Carlos Ruiz',
			phone: '+34600333444',
			isActive: true,
			createdAt: now,
			updatedAt: now,
		},
	]);

	// ==================== PAYMENT METHODS ====================
	console.log('Creando métodos de pago...');
	const paymentMethodId = new ObjectId();
	await database.collection('payment_methods').insertMany([
		{
			_id: paymentMethodId,
			eventId,
			name: 'Efectivo',
			isActive: true,
			createdAt: now,
			updatedAt: now,
		},
		{
			_id: new ObjectId(),
			eventId,
			name: 'Bizum',
			notes: 'Requiere número de teléfono',
			isActive: true,
			createdAt: now,
			updatedAt: now,
		},
		{
			_id: new ObjectId(),
			eventId,
			name: 'Tarjeta',
			isActive: true,
			createdAt: now,
			updatedAt: now,
		},
	]);

	// ==================== CASHIERS ====================
	console.log('Creando cajeros...');
	const cashierId = new ObjectId();
	await database.collection('cashiers').insertMany([
		{
			_id: cashierId,
			eventId,
			name: 'Caja Principal',
			phone: '+34600555666',
			notes: 'Caja 1 - entrada principal',
			isActive: true,
			createdAt: now,
			updatedAt: now,
		},
		{
			_id: new ObjectId(),
			eventId,
			name: 'Caja Secundaria',
			phone: '+34600777888',
			isActive: true,
			createdAt: now,
			updatedAt: now,
		},
	]);

	// ==================== CONSUMPTION TYPES ====================
	console.log('Creando tipos de consumo...');
	const consumptionTypeId1 = new ObjectId();
	const consumptionTypeId2 = new ObjectId();
	await database.collection('consumption_types').insertMany([
		{
			_id: consumptionTypeId1,
			eventId,
			name: 'Para llevar',
			notes: 'Comida para llevar',
			isActive: true,
			createdAt: now,
			updatedAt: now,
		},
		{
			_id: consumptionTypeId2,
			eventId,
			name: 'En el sitio',
			notes: 'Consumo en mesas',
			isActive: true,
			createdAt: now,
			updatedAt: now,
		},
	]);

	// ==================== PICKUP POINTS ====================
	console.log('Creando puntos de recogida...');
	const pickupPointId = new ObjectId();
	await database.collection('pickup_points').insertMany([
		{
			_id: pickupPointId,
			eventId,
			name: 'Mostrador A',
			dealerName: 'María López',
			phone: '+34600999000',
			address: 'Plaza Mayor 1',
			isActive: true,
			createdAt: now,
			updatedAt: now,
		},
		{
			_id: new ObjectId(),
			eventId,
			name: 'Mostrador B',
			dealerName: 'Pedro Martínez',
			phone: '+34600111000',
			isActive: true,
			createdAt: now,
			updatedAt: now,
		},
	]);

	// ==================== STORES ====================
	console.log('Creando tiendas...');
	const storeId = new ObjectId();
	await database.collection('stores').insertMany([
		{
			_id: storeId,
			eventId,
			name: 'Mercado Central',
			seller: 'Juan Comerciante',
			phone: '+34600222333',
			address: 'Calle Mayor 45',
			email: 'mercado@example.com',
			openingHours: 'L-V 9:00-20:00',
			isActive: true,
			createdAt: now,
			updatedAt: now,
		},
		{
			_id: new ObjectId(),
			eventId,
			name: 'Proveedora del Sur',
			phone: '+34600444555',
			isActive: true,
			createdAt: now,
			updatedAt: now,
		},
	]);

	// ==================== UNITS ====================
	console.log('Creando unidades...');
	const unitId = new ObjectId();
	await database.collection('units').insertMany([
		{
			_id: unitId,
			eventId,
			name: 'Kilogramo',
			abbreviation: 'kg',
			isActive: true,
			createdAt: now,
			updatedAt: now,
		},
		{
			_id: new ObjectId(),
			eventId,
			name: 'Litro',
			abbreviation: 'L',
			isActive: true,
			createdAt: now,
			updatedAt: now,
		},
		{
			_id: new ObjectId(),
			eventId,
			name: 'Unidad',
			abbreviation: 'ud',
			isActive: true,
			createdAt: now,
			updatedAt: now,
		},
	]);

	// ==================== PAYERS ====================
	console.log('Creando pagadores...');
	const payerId = new ObjectId();
	await database.collection('payers').insertMany([
		{
			_id: payerId,
			eventId,
			name: 'Organización Principal',
			phone: '+34600666777',
			notes: 'Cuenta principal del evento',
			isActive: true,
			createdAt: now,
			updatedAt: now,
		},
		{
			_id: new ObjectId(),
			eventId,
			name: 'Socio 1',
			phone: '+34600888999',
			isActive: true,
			createdAt: now,
			updatedAt: now,
		},
	]);

	// ==================== PARTNERS ====================
	console.log('Creando socios...');
	await database.collection('partners').insertMany([
		{
			_id: new ObjectId(),
			eventId,
			name: 'Ana Fernández',
			stake: 35.5,
			phone: '+34611222333',
			email: 'ana@example.com',
			isActive: true,
			createdAt: now,
			updatedAt: now,
		},
		{
			_id: new ObjectId(),
			eventId,
			name: 'Miguel Torres',
			stake: 25.0,
			phone: '+34611444555',
			isActive: true,
			createdAt: now,
			updatedAt: now,
		},
		{
			_id: new ObjectId(),
			eventId,
			name: 'Sofía Ramírez',
			stake: 39.5,
			email: 'sofia@example.com',
			isActive: true,
			createdAt: now,
			updatedAt: now,
		},
	]);

	// ==================== PRODUCTS ====================
	console.log('Creando productos...');
	const productId1 = new ObjectId();
	const productId2 = new ObjectId();
	const productId3 = new ObjectId();
	const productId4 = new ObjectId();

	await database.collection('products').insertMany([
		{
			_id: productId1,
			eventId,
			name: 'Parrillada Completa',
			description: 'Parrillada con carne, chorizo y morcilla',
			stock: 50,
			nominalPrice: '15.00',
			// IMPORTANTE: supplement usa ENTEROS (céntimos), no decimales
			supplement: {
				[consumptionTypeId1.toString()]: 0, // para llevar sin suplemento (0 céntimos)
				[consumptionTypeId2.toString()]: 200, // en sitio +2€ (200 céntimos)
			},
			promotions: [],
			isActive: true,
			createdAt: now,
			updatedAt: now,
		},
		{
			_id: productId2,
			eventId,
			name: 'Picarones',
			description: 'Postre típico peruano',
			stock: 100,
			nominalPrice: '5.00',
			promotions: [],
			isActive: true,
			createdAt: now,
			updatedAt: now,
		},
		{
			_id: productId3,
			eventId,
			name: 'Cerveza Artesanal',
			description: 'Cerveza IPA local 33cl',
			stock: 200,
			nominalPrice: '4.50',
			notes: 'Mantener refrigerada',
			promotions: [],
			isActive: true,
			createdAt: now,
			updatedAt: now,
		},
		{
			_id: productId4,
			eventId,
			name: 'Refresco',
			stock: 150,
			nominalPrice: '2.50',
			promotions: [],
			isActive: true,
			createdAt: now,
			updatedAt: now,
		},
	]);

	// ==================== PROMOTIONS ====================
	console.log('Creando promociones...');
	const promotionId1 = new ObjectId();
	const promotionId2 = new ObjectId();

	await database.collection('promotions').insertMany([
		{
			_id: promotionId1,
			eventId,
			name: '3x2 en Cervezas',
			description: 'Compra 3 cervezas y paga solo 2',
			rule: 'XForY',
			conditions: {
				_rule: 'XForY',
				buyX: 3,
				payY: 2,
			},
			applicables: [productId3.toString()],
			startDate: new Date('2025-06-15T00:00:00Z'),
			endDate: new Date('2025-06-15T23:59:59Z'),
			priority: 1,
			isCumulative: false,
			isActive: true,
			createdAt: now,
			updatedAt: now,
		},
		{
			_id: promotionId2,
			eventId,
			name: 'Descuento 10% Parrillada',
			description: '10% de descuento en parrilladas',
			rule: 'PercentageDiscount',
			conditions: {
				_rule: 'PercentageDiscount',
				pct: 10.5,
			},
			applicables: [productId1.toString()],
			startDate: new Date('2025-06-15T12:00:00Z'),
			endDate: new Date('2025-06-15T14:00:00Z'),
			priority: 2,
			isCumulative: true,
			isActive: true,
			createdAt: now,
			updatedAt: now,
		},
	]);

	// Actualizar producto cerveza con promoción 3x2
	await database
		.collection('products')
		.updateOne(
			{ _id: productId3 },
			{ $set: { promotions: [promotionId1.toString()], updatedAt: now } },
		);

	// ==================== EXPENSES ====================
	console.log('Creando gastos...');
	await database.collection('expenses').insertMany([
		{
			_id: new ObjectId(),
			eventId,
			ingredient: 'Carbón 5kg',
			unitId,
			quantity: '10.00',
			basePrice: '8.26',
			vatPct: 21,
			vatAmount: '1.74',
			netPrice: '10.00',
			isPackage: true,
			unitsPerPack: 5,
			unitPrice: '2.00',
			payerId,
			storeId,
			isVerified: true,
			notes: 'Compra para el evento',
			isActive: true,
			createdAt: now,
			updatedAt: now,
		},
		{
			_id: new ObjectId(),
			eventId,
			ingredient: 'Carne de res',
			unitId,
			quantity: '25.00',
			basePrice: '192.31',
			vatPct: 4,
			vatAmount: '7.69',
			netPrice: '200.00',
			isPackage: false,
			payerId,
			storeId,
			isVerified: false,
			isActive: true,
			createdAt: now,
			updatedAt: now,
		},
		{
			_id: new ObjectId(),
			eventId,
			ingredient: 'Servilletas',
			quantity: '500.00',
			basePrice: '28.93',
			vatPct: 21,
			vatAmount: '6.07',
			netPrice: '35.00',
			isPackage: true,
			unitsPerPack: 100,
			unitPrice: '0.07',
			payerId,
			isVerified: true,
			isActive: true,
			createdAt: now,
			updatedAt: now,
		},
	]);

	// ==================== RESERVATIONS ====================
	console.log('Creando reservas...');

	// Reserva 1: Con promoción 3x2 en cervezas
	await database.collection('reservations').insertOne({
		_id: new ObjectId(),
		eventId,
		reserver: 'Juan Pérez',
		order: {
			[productId1.toString()]: 2, // 2 parrilladas
			[productId2.toString()]: 2, // 2 picarones
			[productId3.toString()]: 3, // 3 cervezas (aplica 3x2)
		},
		totalAmount: '43.50',
		salespersonId,
		consumptionTypeId: consumptionTypeId1,
		pickupPointId,
		hasPromoApplied: true,
		appliedPromotionsSnapshot: [
			{
				promotionId: promotionId1.toString(),
				promotionName: '3x2 en Cervezas',
				productId: productId3.toString(),
				productName: 'Cerveza Artesanal',
				quantity: 3,
				discountCents: 450, // 4.50€ en céntimos (precio de 1 cerveza gratis)
				rule: 'XForY',
			},
		],
		linkedReservations: [],
		deposit: '20.00',
		isDelivered: false,
		isPaid: false,
		paymentMethodId,
		cashierId,
		notes: 'Cliente habitual',
		isActive: true,
		createdAt: now,
		updatedAt: now,
	});

	// Reserva 2: Sin promoción, ya pagada y entregada
	await database.collection('reservations').insertOne({
		_id: new ObjectId(),
		eventId,
		reserver: 'María González',
		order: {
			[productId1.toString()]: 1, // 1 parrillada con suplemento
			[productId4.toString()]: 2, // 2 refrescos
		},
		totalAmount: '22.00', // 15 + 2 (suplemento) + 2.50*2
		salespersonId,
		consumptionTypeId: consumptionTypeId2, // "En el sitio" - tiene suplemento de 2€
		pickupPointId,
		hasPromoApplied: false,
		linkedReservations: [],
		deposit: '0.00',
		isDelivered: true,
		isPaid: true,
		paymentMethodId,
		cashierId,
		isActive: true,
		createdAt: now,
		updatedAt: now,
	});

	// Reserva 3: Sin promoción, solo picarones
	await database.collection('reservations').insertOne({
		_id: new ObjectId(),
		eventId,
		reserver: 'Carlos Rodríguez',
		order: {
			[productId2.toString()]: 5, // 5 picarones
		},
		totalAmount: '25.00',
		salespersonId,
		consumptionTypeId: consumptionTypeId1,
		pickupPointId,
		hasPromoApplied: false,
		linkedReservations: [],
		deposit: '10.00',
		isDelivered: false,
		isPaid: true,
		paymentMethodId,
		cashierId,
		notes: 'Pedido grande - preparar con anticipación',
		isActive: true,
		createdAt: now,
		updatedAt: now,
	});

	await closeMongo();
	console.log('✅ Seed completado correctamente');
	console.log(`   - 2 usuarios (admin@example.com / user@example.com, password: password123)`);
	console.log(`   - Evento: ${eventId.toString()}`);
	console.log(`   - 2 vendedores, 3 métodos de pago, 2 cajeros`);
	console.log(`   - 2 tipos de consumo, 2 puntos de recogida`);
	console.log(`   - 2 tiendas, 3 unidades, 2 pagadores, 3 socios`);
	console.log(`   - 4 productos, 2 promociones`);
	console.log(`   - 3 gastos, 3 reservas`);
}

run().catch((err) => {
	console.error('❌ Error en seed:', err);
	process.exit(1);
});
