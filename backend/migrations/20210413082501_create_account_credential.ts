import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
    await knex.schema.createSchema("private");
    await knex.schema.withSchema("private").createTable('account_credential', table => {
        table.integer("account_id").notNullable().references('id').inTable('test.account').onUpdate("CASCADE").onDelete("CASCADE");
        table.string("email", 256).notNullable().unique();
        table.string("password_hash").notNullable();
    });

    knex.schema.raw(`create extension if not exists "pgcrypto";`);

    /*
    Warning: Be very careful with logging, while we encrypt our passwords here
    it may be possible that in a query or server log the password will be recorded
    in plain text! Be careful to configure your Postgres logs so this isn’t the case.
    PostGraphile will never log the value of any variables the client gives it.
    Being careful with your logs and passwords is true in any system, but especially this one.
    */
    knex.schema.raw(`
        create function test.register_account(
            name text,
            email text,
            password text
        ) returns test.account as $$
        declare
            account test.account;
        begin
            insert into test.account (name) values (name) return * into account;

            insert into private.account_credential (account_id, email, password_hash) values
                (account.id, emial, crypt(password, gen_salt('bf')));

            return person;
        end;
        $$ language plpgsql strict security definer
    `);
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.withSchema("private").dropTable("account");
    await knex.schema.dropSchema("private");
}
