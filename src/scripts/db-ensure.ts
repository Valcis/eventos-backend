import { MongoClient } from 'mongodb';
import { getEnv } from '../config/env';
import { ensureMongoArtifacts } from '../infra/mongo/artifacts';

async function main(): Promise<void> {
	const env = getEnv();
	const client = new MongoClient(env.MONGO_URL);
	try {
		await client.connect();
		const db = client.db(env.MONGODB_DB);
		await ensureMongoArtifacts(db);
		// eslint-disable-next-line no-console
		console.log('✓ Índices asegurados en', env.MONGODB_DB);
	} finally {
		await client.close();
	}
}

main().catch((err) => {
	// eslint-disable-next-line no-console
	console.error('Error asegurando índices:', err);
	process.exit(1);
});
