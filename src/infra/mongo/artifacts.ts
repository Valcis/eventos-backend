import {getDb} from './client';
import {eventConfigsValidator, eventConfigsIndexes} from '../../modules/event-configs/eventConfigs.artifacts';
import {preciosValidator, preciosIndexes} from '../../modules/precios/precios.artifacts';
import {gastosValidator, gastosIndexes} from '../../modules/gastos/gastos.artifacts';
import {reservasValidator, reservasIndexes} from '../../modules/reservas/reservas.artifacts';

type IndexSpec = Readonly<{
    keys: Readonly<Record<string, 1 | -1>>;
    options?: Readonly<Record<string, unknown>>;
}>;

async function ensureCollection(
    name: string,
    validator: Readonly<Record<string, unknown>>,
    indexes: ReadonlyArray<IndexSpec>
): Promise<void> {
    const db = await getDb();
    const exists = await db.listCollections({name}).toArray();
    if (exists.length === 0) {
        await db.createCollection(name, validator);
    } else {
        await db.command({collMod: name, ...validator});
    }
    if (indexes.length > 0) {
        await db.collection(name).createIndexes(
            indexes.map(ix => ({key: ix.keys, ...(ix.options ?? {})}))
        );
    }
}

export async function ensureMongoArtifacts(): Promise<void> {
    await ensureCollection('event_configs', eventConfigsValidator, eventConfigsIndexes);
    await ensureCollection('precios', preciosValidator, preciosIndexes);
    await ensureCollection('gastos', gastosValidator, gastosIndexes);
    await ensureCollection('reservas', reservasValidator, reservasIndexes);
}
