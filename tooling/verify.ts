import {spawnSync} from 'node:child_process';
// The release gate must never turn database-backed acceptance into skipped tests.
if(!process.env.TEST_DATABASE_URL)throw new Error('TEST_DATABASE_URL is required for the verification gate');
for(const args of [['run','check'],['test']]){const result=spawnSync('npm',args,{stdio:'inherit',env:process.env});if(result.status!==0)process.exit(result.status??1);}
