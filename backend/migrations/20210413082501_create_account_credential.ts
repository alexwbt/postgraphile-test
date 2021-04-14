import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
    await knex.schema.createSchema("private");
    await knex.schema.withSchema("private").createTable('account_credential', table => {
        table.integer("account_id").notNullable().references('id').inTable('test.account').onUpdate("CASCADE").onDelete("CASCADE");
        table.string("email", 256).notNullable().unique();
        table.string("password_hash").notNullable();
    });

    knex.schema.raw(/*sql*/`create extension if not exists "pgcrypto";`);

    /*
    Warning: Be very careful with logging, while we encrypt our passwords here
    it may be possible that in a query or server log the password will be recorded
    in plain text! Be careful to configure your Postgres logs so this isn’t the case.
    PostGraphile will never log the value of any variables the client gives it.
    Being careful with your logs and passwords is true in any system, but especially this one.
    */
    knex.schema.raw(/*sql*/`
        create function test.register_account(
            name text,
            email text,
            password text
        ) returns test.account as $$
        declare
            account test.account;
        begin
            insert into test.account (name) values (name) returning * into account;

            insert into private.account_credential (account_id, email, password_hash) values
                (account.id, emial, crypt(password, gen_salt('bf')));

            return person;
        end;
        $$ language plpgsql strict security definer;
    `);

    knex.schema.raw(/*sql*/`
        create role postgraphile login password 'postgraphile1234';

        create role anonymous;
        grant anonymous to postgraphile;

        create role app_user;
        grant app_user to postgraphile;

        grant select on schema test to anonymous, app_user;
    `);

    knex.schema.raw(/*sql*/`
        create type test.jwt_token as (
            role text,
            account_id integer
        );

        create function test.authenticate(
            email text,
            password text
        ) returns test.jwt_token as $$
            select ('app_user', account_id)::test.jwt_token
                from private.account_credential
                where account_credential.email = $1
                    and account_credential.password_hash = crypt($2, account_credential.password_hash);
        $$ language sql strict security definer;

        create function test.get_user() returns test.account as $$
            select *
                from test.account
                where id = current_setting('jwt.claims.account_id', true)::integer
        $$ language sql stable;
    `);

    knex.schema.raw(/*sql*/`
        alter table test.event enable row level security;
        alter table test.attendee enable row level security;

        create policy select_account on test.account for select
            using (id = current_setting('jwt.claims.account_id', true)::integer);

        create policy select_attendee on test.attendee for select
            using (account_id = current_setting('jwt.claims.account_id', true)::integer);
    `);
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.withSchema("private").dropTable("account_credential");
    await knex.schema.dropSchema("private");

    await knex.schema.raw(/*sql*/`
        drop policy if exists select_attendee on test.attendee;
        drop policy if exists select_account on test.account;
        drop function if exists test.get_user;
        drop function if exists test.authenticate;
        drop type if exists test.jwt_token;
        drop role if exists app_user;
        drop role if exists anonymous;
        drop role if exists postgraphile;
        drop function if exists test.register_account;
    `);
}
