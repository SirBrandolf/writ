/**
 * Loads the first existing env file among WRIT_ENV_PATH, repo-root app.env, or /etc/app.env.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../..');

const candidateEnvFiles = [
    process.env.WRIT_ENV_PATH,
    path.join(repoRoot, 'app.env'),
    '/etc/app.env',
].filter((value): value is string => Boolean(value));

const selectedEnvFile = candidateEnvFiles.find((filePath) => fs.existsSync(filePath));

if (selectedEnvFile) {
    dotenv.config({ path: selectedEnvFile });
} else {
    dotenv.config();
}
