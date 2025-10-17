import { ObjectId } from 'mongodb';
import { connectMongo, closeMongo, getDb } from '../infra/mongo/client';

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
	];
	for (const collectionName of collections) {
		await database.collection(collectionName).deleteMany({});
	}

	// ==================== EVENTS ====================
	console.log('Creando evento...');
	const eventResult = await database.collection('events').insertOne({
		_id: new ObjectId(),
		name: 'Fiesta de la Parrillada 2025',
		date: new Date('2025-06-15'),
		capacity: 200,
		capitalAmount: '5000.00',
		isActive: true,
		createdAt: now,
		updatedAt: now,
	});
	const eventId = eventResult.insertedId.toString();
	console.log(`Evento creado: ${eventId}`);

	// ==================== SALESPEOPLE ====================
	console.log('Creando vendedores...');
	const salespersonResult = await database.collection('salespeople').insertMany([
		{
			_id: new ObjectId(),
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
	const salespersonId = salespersonResult.insertedIds[0]?.toString();
	if (!salespersonId) throw new Error('Failed to insert salesperson');

	// ==================== PAYMENT METHODS ====================
	console.log('Creando métodos de pago...');
	const paymentMethodResult = await database.collection('payment_methods').insertMany([
		{
			_id: new ObjectId(),
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
	const paymentMethodId = paymentMethodResult.insertedIds[0]?.toString();
	if (!paymentMethodId) throw new Error('Failed to insert payment method');

	// ==================== CASHIERS ====================
	console.log('Creando cajeros...');
	const cashierResult = await database.collection('cashiers').insertMany([
		{
			_id: new ObjectId(),
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
	const cashierId = cashierResult.insertedIds[0]?.toString();
	if (!cashierId) throw new Error('Failed to insert cashier');

	// ==================== CONSUMPTION TYPES ====================
	console.log('Creando tipos de consumo...');
	const consumptionTypeResult = await database.collection('consumption_types').insertMany([
		{
			_id: new ObjectId(),
			eventId,
			name: 'Para llevar',
			notes: 'Comida para llevar',
			isActive: true,
			createdAt: now,
			updatedAt: now,
		},
		{
			_id: new ObjectId(),
			eventId,
			name: 'En el sitio',
			notes: 'Consumo en mesas',
			isActive: true,
			createdAt: now,
			updatedAt: now,
		},
	]);
	const consumptionTypeId1 = consumptionTypeResult.insertedIds[0]?.toString();
	const consumptionTypeId2 = consumptionTypeResult.insertedIds[1]?.toString();
	if (!consumptionTypeId1 || !consumptionTypeId2)
		throw new Error('Failed to insert consumption types');

	// ==================== PICKUP POINTS ====================
	console.log('Creando puntos de recogida...');
	const pickupPointResult = await database.collection('pickup_points').insertMany([
		{
			_id: new ObjectId(),
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
	const pickupPointId = pickupPointResult.insertedIds[0]?.toString();
	if (!pickupPointId) throw new Error('Failed to insert pickup point');

	// ==================== STORES ====================
	console.log('Creando tiendas...');
	const storeResult = await database.collection('stores').insertMany([
		{
			_id: new ObjectId(),
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
	const storeId = storeResult.insertedIds[0]?.toString();
	if (!storeId) throw new Error('Failed to insert store');

	// ==================== UNITS ====================
	console.log('Creando unidades...');
	const unitResult = await database.collection('units').insertMany([
		{
			_id: new ObjectId(),
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
	const unitId = unitResult.insertedIds[0]?.toString();
	if (!unitId) throw new Error('Failed to insert unit');

	// ==================== PAYERS ====================
	console.log('Creando pagadores...');
	const payerResult = await database.collection('payers').insertMany([
		{
			_id: new ObjectId(),
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
	const payerId = payerResult.insertedIds[0]?.toString();
	if (!payerId) throw new Error('Failed to insert payer');

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
	const productResult = await database.collection('products').insertMany([
		{
			_id: new ObjectId(),
			eventId,
			name: 'Parrillada Completa',
			description: 'Parrillada con carne, chorizo y morcilla',
			stock: 50,
			nominalPrice: '15.00',
			supplement: {
				[consumptionTypeId1]: 0, // para llevar sin suplemento
				[consumptionTypeId2]: 2, // en sitio +2€
			},
			promotions: [],
			isActive: true,
			createdAt: now,
			updatedAt: now,
		},
		{
			_id: new ObjectId(),
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
			_id: new ObjectId(),
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
			_id: new ObjectId(),
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
	const productId1 = productResult.insertedIds[0]?.toString();
	const productId2 = productResult.insertedIds[1]?.toString();
	const productId3 = productResult.insertedIds[2]?.toString();
	if (!productId1 || !productId2 || !productId3) throw new Error('Failed to insert products');

	// ==================== PROMOTIONS ====================
	console.log('Creando promociones...');
	const promotionResult = await database.collection('promotions').insertMany([
		{
			_id: new ObjectId(),
			eventId,
			name: '3x2 en Cervezas',
			description: 'Compra 3 cervezas y paga solo 2',
			rule: 'XForY',
			conditions: {
				_rule: 'XForY',
				buyX: 3,
				payY: 2,
			},
			applicables: [productId3],
			startDate: new Date('2025-06-15T00:00:00Z'),
			endDate: new Date('2025-06-15T23:59:59Z'),
			priority: 1,
			isCumulative: false,
			isActive: true,
			createdAt: now,
			updatedAt: now,
		},
		{
			_id: new ObjectId(),
			eventId,
			name: 'Descuento 10% Parrillada',
			description: '10% de descuento en parrilladas',
			rule: 'PercentageDiscount',
			conditions: {
				_rule: 'PercentageDiscount',
				pct: 10.5,
			},
			applicables: [productId1],
			startDate: new Date('2025-06-15T12:00:00Z'),
			endDate: new Date('2025-06-15T14:00:00Z'),
			priority: 2,
			isCumulative: true,
			isActive: true,
			createdAt: now,
			updatedAt: now,
		},
	]);
	const promotionId1 = promotionResult.insertedIds[0]?.toString();
	if (!promotionId1) throw new Error('Failed to insert promotion');

	// Actualizar productos con promociones
	await database
		.collection('products')
		.updateOne({ _id: new ObjectId(productId3) }, { $set: { promotions: [promotionId1] } });

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
	await database.collection('reservations').insertMany([
		{
			_id: new ObjectId(),
			eventId,
			reserver: 'Juan Pérez',
			order: {
				[productId1]: 2, // 2 parrilladas
				[productId2]: 2, // 2 picarones
				[productId3]: 3, // 3 cervezas
			},
			totalAmount: '43.50',
			salespersonId,
			consumptionTypeId: consumptionTypeId1,
			pickupPointId,
			hasPromoApplied: true,
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
		},
		{
			_id: new ObjectId(),
			eventId,
			reserver: 'María González',
			order: {
				[productId1]: 1, // 1 parrillada
				[productId3]: 2, // 2 cervezas
			},
			totalAmount: '24.00',
			salespersonId,
			consumptionTypeId: consumptionTypeId2,
			pickupPointId,
			hasPromoApplied: false,
			linkedReservations: [],
			isDelivered: true,
			isPaid: true,
			paymentMethodId,
			cashierId,
			isActive: true,
			createdAt: now,
			updatedAt: now,
		},
		{
			_id: new ObjectId(),
			eventId,
			reserver: 'Carlos Rodríguez',
			order: {
				[productId2]: 5, // 5 picarones
			},
			totalAmount: '25.00',
			salespersonId,
			consumptionTypeId: consumptionTypeId1,
			hasPromoApplied: false,
			linkedReservations: [],
			isDelivered: false,
			isPaid: true,
			paymentMethodId,
			notes: 'Pedido grande - preparar con anticipación',
			isActive: true,
			createdAt: now,
			updatedAt: now,
		},
	]);

	await closeMongo();
	console.log('✅ Seed completado correctamente');
	console.log(`   - Evento: ${eventId}`);
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
