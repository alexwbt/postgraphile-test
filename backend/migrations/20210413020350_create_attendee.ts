import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
    await knex.schema.withSchema('test').createTable("attendee", table => {
        table.increments();
        table.integer("account_id").notNullable().references('id').inTable('test.account').onUpdate("CASCADE").onDelete("CASCADE");
        table.integer("event_id").notNullable().references('id').inTable('test.event').onUpdate("CASCADE").onDelete("CASCADE");
        table.timestamps(false, true);
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.withSchema('test').dropTable("attendee");
}
