import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import { postgraphile } from 'postgraphile';
import PSI from '@graphile-contrib/pg-simplify-inflector';

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
})().catch(err => {
    console.error(err);
});
