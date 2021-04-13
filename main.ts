import dotenv from 'dotenv';
import express from 'express';
// import Knex from 'knex';
// import knexConfig from './knexfile';
import { postgraphile } from 'postgraphile';
import PSI from '@graphile-contrib/pg-simplify-inflector';

(async () => {

    dotenv.config();
    
    const {
        NODE_ENV,
        PORT,
    
        DB_HOST,
        DB_PORT,
        DB_NAME,
        DB_USER,
        DB_PASSWORD
    } = process.env;
    
    // const knex = Knex(knexConfig[NODE_ENV || "development"]);

    const app = express();

    const db_url = `postgres://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`;
    console.log(`Database URL: postgres://${DB_USER}:[SECRET]@${DB_HOST}:${DB_PORT}/${DB_NAME}`);

    app.use(postgraphile(db_url, "test", {
        graphiql: true,
        enhanceGraphiql: true,
        simpleCollections: 'only',
        appendPlugins: [PSI],
        graphileBuildOptions: {pgOmitListSuffix: true}
    }));

    await new Promise<void>(res => app.listen(PORT, res));
    console.log(`(${NODE_ENV}) Server running on port ${PORT}.`);
})();
