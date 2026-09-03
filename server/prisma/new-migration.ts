import 'dotenv/config';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

/**
 * `prisma migrate dev` without a shadow database.
 *
 *   npm run migrate:new -- add-project-notes
 *
 * Prisma normally creates a throwaway database to diff against, which needs the
 * CREATEDB grant on the Postgres role (`ALTER ROLE <user> CREATEDB;`). Where that
 * grant is not available — a managed database, or a locked-down local install —
 * this diffs the live database against schema.prisma instead, applies the result
 * and records it in _prisma_migrations, which is what migrate dev would leave
 * behind. `prisma migrate deploy` picks the folders up unchanged.
 */
const SCHEMA = path.join(__dirname, 'schema.prisma');
const MIGRATIONS = path.join(__dirname, 'migrations');

const prisma = (...args: string[]) =>
  execFileSync('npx', ['prisma', ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

function main() {
  const rawName = process.argv[2];
  if (!rawName) {
    console.error('Usage: npm run migrate:new -- <migration-name>');
    process.exitCode = 1;
    return;
  }

  const name = rawName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  if (!name) {
    console.error('Give the migration a name with at least one letter or digit.');
    process.exitCode = 1;
    return;
  }

  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL is not set.');
    process.exitCode = 1;
    return;
  }

  const sql = prisma(
    'migrate',
    'diff',
    '--from-url',
    url,
    '--to-schema-datamodel',
    SCHEMA,
    '--script',
  );

  // A no-op diff is only the header comment Prisma always emits.
  const meaningful = sql
    .split('\n')
    .filter((line) => line.trim() && !line.trimStart().startsWith('--'))
    .join('\n');

  if (!meaningful) {
    console.log('The database already matches schema.prisma — nothing to migrate.');
    return;
  }

  // Same folder name shape migrate dev uses, so the two are interchangeable.
  const stamp = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
  const dir = `${stamp}_${name}`;
  const file = path.join(MIGRATIONS, dir, 'migration.sql');

  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, sql);
  console.log(`Wrote prisma/migrations/${dir}/migration.sql`);

  try {
    prisma('db', 'execute', '--file', file, '--schema', SCHEMA);
    prisma('migrate', 'resolve', '--applied', dir);
  } catch (error) {
    // Leave the folder in place: the SQL is the useful part, and re-running
    // after a fix should not regenerate a second migration for the same change.
    console.error(`\nApplying ${dir} failed. Fix migration.sql, then run:`);
    console.error(`  npx prisma db execute --file ${file} --schema ${SCHEMA}`);
    console.error(`  npx prisma migrate resolve --applied ${dir}`);
    throw error;
  }

  prisma('generate');
  console.log(`Applied ${dir} and regenerated the client.`);
}

try {
  main();
} catch (error) {
  const stderr = (error as { stderr?: Buffer | string }).stderr;
  if (stderr) console.error(stderr.toString());
  else console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
