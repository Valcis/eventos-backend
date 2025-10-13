import { getDb, getClient } from '../infra/mongo/client';

async function run(): Promise<void> {
	const client = await getClient();
	const db = await getDb();

	const eventId = 'evento123';

	// 1) event-configs (selectores + presets mínimos)
	await db.collection('event_configs').updateOne(
		{ eventId },
		{
			$set: {
				eventId,
				selectores: {
					comercial: [{ id: 'c1', nombre: 'Laura', isActive: true }],
					metodoPago: [
						{ id: 'ef1', nombre: 'efectivo', isActive: true },
						{ id: 'bz1', nombre: 'bizum', requiereReceptor: true, isActive: true },
					],
					receptor: [{ id: 'rc1', nombre: 'Caja Principal', isActive: true }],
					tipoConsumo: [{ id: 'lc1', nombre: 'para_llevar', isActive: true }],
					puntoRecogida: [{ id: 'p1', nombre: 'Mostrador A', isActive: true }],
				},
				presets: {
					precios: {
						order: ['concepto', 'importe', 'isActive', 'createdAt', 'updatedAt', 'id'],
						hidden: ['moneda', 'createdAt', 'updatedAt', 'id'],
						widths: { concepto: 240, importe: 120 },
					},
					gastos: {
						order: [
							'producto',
							'cantidad',
							'tipoPrecio',
							'precioBase',
							'precioNeto',
							'comprobado',
							'isActive',
							'createdAt',
							'updatedAt',
							'id',
						],
						hidden: [
							'tipoIVA',
							'isPack',
							'unidadesPack',
							'precioUnidad',
							'pagadorId',
							'tiendaId',
							'notas',
							'locked',
							'isActive',
							'createdAt',
							'updatedAt',
							'id',
						],
						widths: { producto: 240, precioNeto: 120 },
					},
					reservas: {
						order: [
							'cliente',
							'tipoConsumoId',
							'metodoPagoId',
							'totalPedido',
							'pagado',
							'createdAt',
							'updatedAt',
							'id',
						],
						hidden: [
							'picarones',
							'receptorId',
							'comercialId',
							'puntoRecogidaId',
							'comprobado',
							'locked',
							'isActive',
							'createdAt',
							'updatedAt',
							'id',
						],
						widths: { cliente: 220, totalPedido: 120 },
					},
				},
			},
		},
		{ upsert: true },
	);

	const now = new Date();

	// 2) precios
	await db.collection('precios').insertMany([
		{
			eventId,
			concepto: 'Parrillada',
			importe: 12.5,
			moneda: 'EUR',
			isActive: true,
			createdAt: now,
			updatedAt: now,
		},
		{
			eventId,
			concepto: 'Picarones',
			importe: 4.0,
			moneda: 'EUR',
			isActive: true,
			createdAt: now,
			updatedAt: now,
		},
	]);

	// 3) gastos
	await db.collection('gastos').insertMany([
		{
			eventId,
			producto: 'Carbón 5kg',
			cantidad: 2,
			tipoPrecio: 'con IVA',
			tipoIVA: 21,
			precioBase: 10,
			precioNeto: 12.1,
			comprobado: false,
			locked: false,
			isActive: true,
			pagadorId: 'c1',
			tiendaId: 'p1',
			createdAt: now,
			updatedAt: now,
		},
	]);

	// 4) reservas
	await db.collection('reservas').insertMany([
		{
			eventId,
			cliente: 'Juan Pérez',
			parrilladas: 1,
			picarones: 0,
			metodoPagoId: 'bz1',
			receptorId: 'rc1',
			tipoConsumoId: 'lc1',
			comercialId: 'c1',
			totalPedido: 24.0,
			pagado: true,
			comprobado: false,
			locked: false,
			puntoRecogidaId: 'p1',
			isActive: true,
			createdAt: now,
			updatedAt: now,
		},
	]);

	await client.close();
	// eslint-disable-next-line no-console
	console.log('Seed OK');
}

run().catch((err) => {
	// eslint-disable-next-line no-console
	console.error(err);
	process.exit(1);
});
