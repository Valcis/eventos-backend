import { MongoClient } from 'mongodb';
import { getEnv } from '../config/env';

const uri = getEnv().MONGODB_URI;
if (!uri) {
	console.error('❌ Falta MONGODB_URI en el entorno.');
	process.exit(2);
}

(async () => {
	const client = new MongoClient(uri, {
		maxPoolSize: 1,
		serverSelectionTimeoutMS: 8000,
	});

	try {
		await client.connect();
		const res = await client.db().admin().ping();
		if (res?.ok === 1) {
			console.log('✅ Conexión OK y ping exitoso.');
			process.exit(0);
		} else {
			console.error('⚠️ Conectó pero ping no OK:', res);
			process.exit(3);
		}
	} catch (err) {
		const e = err as Error & { code?: string; name?: string };
		console.error('❌ Error de conexión:');
		console.error(`name=${e?.name} code=${e?.code} msg=${e?.message}`);
		process.exit(1);
	} finally {
		await client.close().catch(() => {});
	}
})();
