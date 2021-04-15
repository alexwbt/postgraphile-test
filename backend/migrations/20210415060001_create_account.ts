import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
    // create schemas
    await knex.schema.createSchema('test');
    await knex.schema.createSchema('test_private');

    // create roles
    await knex.schema.raw(/*sql*/`
        -- postgraphile
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
        table.string('email', 256).notNullable().unique();
        table.string('password').notNullable();
        table.specificType('signed_at', 'double precision').defaultTo(0);
        table.timestamps(false, true);
    });

    // create table account info
    await knex.schema.withSchema('test').createTable('account_info', table => {
        table.increments();
        table.bigInteger('account_id').references('id').inTable('test_private.account').onUpdate('CASCADE').onDelete('CASCADE');
        table.string('name', 50);
        table.timestamps(false, true);
    });

    // authentication
    await knex.schema.raw(/*sql*/`
        -- token type
        create type test.jwt_token as (role text, account_id integer, signed_at double precision);

        -- enable pgcrypto
        create extension if not exists "pgcrypto";

        -- auth function
        create function test.authenticate(email text, password text) returns test.jwt_token as $$
            declare
                now_epoch double precision := extract(epoch from now());
                token test.jwt_token;
            begin
                select 'app_user', id, now_epoch
                    into token
                    from test_private.account
                    where account.email = $1
                        and account.password = crypt($2, account.password);
                update test_private.account
                    set signed_at = now_epoch
                    where account.id = token.account_id;
                return token;
            end;
        $$ language plpgsql strict security definer;

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

        -- valid token function
        create function test.valid_token() returns boolean as $$
            declare
                last_signed_at double precision;
            begin
                select signed_at
                    into last_signed_at
                    from test_private.account
                    where id = current_setting('jwt.claims.account_id', true)::integer;

                if last_signed_at != current_setting('jwt.claims.signed_at', true)::double precision then
                    raise exception 'invalid jwt token';
                    return false;
                else
                    return true;
                end if;
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
        create policy select_account_info on test.account_info for select using (account_id = current_setting('jwt.claims.account_id', true)::integer and test.valid_token());
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
        drop function test.valid_token;
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
