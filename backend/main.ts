import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import { postgraphile } from 'postgraphile';
import PSI from '@graphile-contrib/pg-simplify-inflector';
import { run } from 'graphile-worker';

(async () => {
    dotenv.config();
    const {
        NODE_ENV,
        PORT,
        JWT_SECRET,

        DB_HOST,
        DB_PORT,
        DB_NAME
    } = process.env;

    const db_url = `postgres://postgraphile:postgraphile1234@${DB_HOST}:${DB_PORT}/${DB_NAME}`;
    console.log(`Database URL: ${db_url}`);

    // Run a worker to execute jobs:
    const runner = await run({
        connectionString: db_url,
        concurrency: 5,
        // Install signal handlers for graceful shutdown on SIGINT, SIGTERM, etc
        noHandleSignals: false,
        pollInterval: 1000,
        // you can set the taskList or taskDirectory but not both
        taskList: {
            hello: async (payload, helpers) => {
                // const { name } = payload;
                helpers.logger.info(`Hello world ${JSON.stringify(payload)}, ${JSON.stringify(helpers)}`);
            },
        },
        // or:
        //   taskDirectory: `${__dirname}/tasks`,
    });

    const postgraphile_middleware = postgraphile(db_url, "test", {
        graphiql: true,
        enhanceGraphiql: true,

        pgDefaultRole: "anonymous_user",

        simpleCollections: 'only',
        appendPlugins: [PSI],
        graphileBuildOptions: {
            pgOmitListSuffix: true
        },
        jwtSecret: JWT_SECRET,
        jwtPgTypeIdentifier: "test.jwt_token"
    });

    const app = express();
    app.use(cors());
    app.use(postgraphile_middleware);

    app.listen(PORT, () => {
        console.log(`(${NODE_ENV}) Server running on port ${PORT}.`);
    });
})();
