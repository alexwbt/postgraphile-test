import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
    await knex.schema.raw(/*sql*/`
        create function test.hello(name text) returns void as $$
            select graphile_worker.add_job('hello', json_build_object('name', $1));
        $$ language sql strict security definer;
    `);
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.raw(/*sql*/`
        drop function test.hello;
    `);
}
