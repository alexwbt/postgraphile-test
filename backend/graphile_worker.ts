import { run } from 'graphile-worker';
import dotenv from 'dotenv';

dotenv.config();
const {
    DB_USER,
    DB_PASSWORD,
    DB_HOST,
    DB_PORT,
    DB_NAME
} = process.env;

(async () => {
    const runner = await run({
        connectionString: `postgres://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`,
        concurrency: 5,
        noHandleSignals: false,
        pollInterval: 1000,
        taskDirectory: `${__dirname}/tasks`,
    });
    await runner.promise;
})().catch(err => {
    console.error(err);
});
