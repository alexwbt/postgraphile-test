import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
    await knex.schema.withSchema('test').createTable('shop', table => {
        table.increments();
        table.integer('account_info_id').references('id').inTable('test.account_info').onUpdate('CASCADE').onDelete('CASCADE');
        table.timestamps(false, true);
    });
    // grants
    await knex.schema.raw(/*sql*/`
        -- shop
        grant select on table test.shop to app_user;
        alter table test.shop enable row level security;
        -- create policy select_shop on test.shop for select using (account_id = current_setting('jwt.claims.account_id', true)::integer);
    `);
}

export async function down(knex: Knex): Promise<void> {
    // revokes
    await knex.schema.raw(/*sql*/`
        -- shop
        -- drop policy select_shop on test.shop;
        alter table test.shop disable row level security;
        revoke select on table test.shop from app_user;
    `);
    await knex.schema.withSchema('test').dropTable('shop');
}
