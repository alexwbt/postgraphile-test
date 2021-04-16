const { run } = require('graphile-worker');
const dotenv = require('dotenv');

dotenv.config();
const {
    DB_USER,
    DB_PASSWORD,
    DB_HOST,
    DB_PORT,
    DB_NAME
} = process.env;

async function main() {
    // Run a worker to execute jobs:
    const runner = await run({
        connectionString: `postgres://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`,
        concurrency: 5,
        // Install signal handlers for graceful shutdown on SIGINT, SIGTERM, etc
        noHandleSignals: false,
        pollInterval: 1000,
        // you can set the taskList or taskDirectory but not both
        taskList: {
            hello: async (payload, helpers) => {
                const { name } = payload;
                helpers.logger.info(`Hello, ${name}`);
            },
        },
        // or:
        //   taskDirectory: `${__dirname}/tasks`,
    });

    // If the worker exits (whether through fatal error or otherwise), this
    // promise will resolve/reject:
    await runner.promise;
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
