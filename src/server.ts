import { buildApp } from './app';
import { getEnv } from './config/env';

const env = getEnv();

buildApp().then((app) => {
	app.listen({ port: env.PORT, host: '0.0.0.0' })
		.then(() => {
			app.log.info(`Eventos API v2.0.0 on :${env.PORT}${env.BASE_PATH} (docs at /docs)`);
		})
		.catch((err) => {
			app.log.error(err);
			process.exit(1);
		});
});
