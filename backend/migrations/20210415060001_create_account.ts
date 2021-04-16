import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
    // create schemas
    await knex.schema.createSchema('test');
    await knex.schema.createSchema('test_private');

    // create roles
    await knex.schema.raw(/*sql*/`
        -- postgrpahile
        create role postgraphile login password 'postgraphile1234';
        -- anonymous
        create role anonymous_user;
        grant anonymous_user to postgraphile;
        -- app user
        create role app_user;
        grant app_user to postgraphile;
    `);

    // create table account
    await knex.schema.withSchema('test_private').createTable('account', table => {
        table.increments();
        table.string('email', 100).notNullable().unique();
        table.string('password', 60).notNullable();
    });

    // create table account info
    await knex.schema.withSchema('test').createTable('account_info', table => {
        table.increments();
        table.integer('account_id').references('id').inTable('test_private.account').onUpdate('CASCADE').onDelete('CASCADE');
        table.string('name', 50);
    });

    // authentication
    await knex.schema.raw(/*sql*/`
        -- token type
        create type test.jwt_token as (role text, account_id integer);

        -- enable pgcrypto
        create extension if not exists "pgcrypto";

        -- auth function
        create function test.authenticate(email text, password text) returns test.jwt_token as $$
            select ('app_user', id)::test.jwt_token
                from test_private.account
                where account.email = $1
                    and account.password = crypt($2, account.password);
        $$ language sql strict security definer;

        -- register function
        create function test.register_account(name text, email text, password text) returns integer as $$
            declare
                return_id integer;
            begin
                insert into test_private.account (email, password) values ($2, crypt($3, gen_salt('bf'))) returning id into return_id;
                insert into test.account_info (account_id, name) values (return_id, $1);
                return return_id;
            end;
        $$ language plpgsql strict security definer;
    `);

    // grants
    await knex.schema.raw(/*sql*/`
        -- schema
        grant usage on schema test to anonymous_user, app_user;

        -- auth functions
        grant execute on function test.authenticate to anonymous_user, app_user;
        grant execute on function test.register_account to anonymous_user, app_user;

        -- account_info
        grant select on table test.account_info to app_user;
        alter table test.account_info enable row level security;
        create policy select_account_info on test.account_info for select using (account_id = current_setting('jwt.claims.account_id', true)::integer);
    `);
}

export async function down(knex: Knex): Promise<void> {
    // revokes
    await knex.schema.raw(/*sql*/`
        -- account_info
        drop policy select_account_info on test.account_info;
        alter table test.account_info disable row level security;
        revoke select on table test.account_info from app_user;

        -- auth functions
        revoke execute on function test.register_account from anonymous_user, app_user;
        revoke execute on function test.authenticate from anonymous_user, app_user;

        -- schema
        revoke usage on schema test from anonymous_user, app_user;
    `);

    // authentication
    await knex.schema.raw(/*sql*/`
        drop function test.register_account;
        drop function test.authenticate;
        drop type test.jwt_token;
    `);

    // drop schemas
    await knex.schema.withSchema('test').dropTable('account_info');
    await knex.schema.withSchema('test_private').dropTable('account');

    // drop role
    await knex.schema.raw(/*sql*/`
        -- app user
        reassign owned by app_user to postgres;
        drop owned by app_user;
        drop role app_user;
        -- anonymous
        reassign owned by anonymous_user to postgres;
        drop owned by anonymous_user;
        drop role anonymous_user;
        -- postgraphile
        reassign owned by postgraphile to postgres;
        drop owned by postgraphile;
        drop role postgraphile;
    `);

    // drop schema
    await knex.schema.dropSchema('test_private');
    await knex.schema.dropSchema('test');
}
