import { configDefaults, defineConfig } from 'vitest/config';

// Database tests exercise the real global scheduler. Parallel test files sharing
// one database can claim each other's fixture Runs; serialize the files while
// retaining explicit concurrency tests within each suite.
export default defineConfig({ test: { exclude: [...configDefaults.exclude, '.local/**'], fileParallelism: false, globalSetup: ['./testing/database-setup.ts'], setupFiles: ['./testing/test-environment.ts'] } });
