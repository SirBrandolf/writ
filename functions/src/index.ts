/**
 * Runs when a Firebase Auth user is deleted (Console, Admin SDK, or client deleteUser).
 * Deletes all notes for that uid so Postgres does not retain orphaned rows.
 *
 * Deploy (once per project):
 * - firebase functions:secrets:set WRIT_PASSWORD
 * - firebase deploy --only functions
 * First deploy may prompt for parameter values WRIT_USER, PGDATABASE, PGHOST (see defineString below).
 */
import { initializeApp } from 'firebase-admin/app';
import * as logger from 'firebase-functions/logger';
import { defineSecret, defineString } from 'firebase-functions/params';
import * as functions from 'firebase-functions/v1';
import { Pool } from 'pg';

initializeApp();

const writUser = defineString('WRIT_USER');
const pgDatabase = defineString('PGDATABASE');
const pgHost = defineString('PGHOST');
const pgPort = defineString('PGPORT', { default: '5432' });
const writPassword = defineSecret('WRIT_PASSWORD');

export const cleanupNotesOnAuthDelete = functions
    .runWith({ secrets: [writPassword] })
    .auth.user()
    .onDelete(async (user) => {
        const uid = user.uid;
        const pool = new Pool({
            user: writUser.value(),
            password: writPassword.value(),
            host: pgHost.value(),
            port: Number(pgPort.value()),
            database: pgDatabase.value(),
            max: 2,
        });
        try {
            logger.info('Auth user deleted; purging notes', { uid });
            const result = await pool.query('DELETE FROM notes WHERE user_id = $1', [uid]);
            logger.info('Notes purge complete', { uid, deleted_count: result.rowCount ?? 0 });
        } catch (err) {
            logger.error('Notes purge failed', { uid, err });
            throw err;
        } finally {
            await pool.end();
        }
    });
