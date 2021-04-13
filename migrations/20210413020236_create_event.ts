import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
    await knex.schema.withSchema('test').createTable("event", table => {
        table.increments();
        table.string("name", 20).unique().notNullable();
        table.timestamps(false, true);
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.withSchema('test').dropTable("event");
}
