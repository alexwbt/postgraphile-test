import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
    await knex.schema.createSchema("test");
    await knex.schema.withSchema('test').createTable("account", table => {
        table.increments();
        table.string("name", 20).unique().notNullable();
        table.timestamps(false, true);
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.withSchema('test').dropTable("account");
    await knex.schema.dropSchema("test");
}
