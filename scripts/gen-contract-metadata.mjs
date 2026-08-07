import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const contractsDir = resolve(root, 'contracts');
const metadataPath = resolve(contractsDir, 'interfaces/metadata.json');
const outDir = resolve(contractsDir, 'out');

const artifacts = {
  InstitutionRegistry: JSON.parse(readFileSync(resolve(outDir, 'InstitutionRegistry.sol/InstitutionRegistry.json'), 'utf8')).abi,
  EduProofCertificate: JSON.parse(readFileSync(resolve(outDir, 'EduProofCertificate.sol/EduProofCertificate.json'), 'utf8')).abi,
};

const metadata = JSON.parse(readFileSync(metadataPath, 'utf8'));

let updated = 0;
for (const chain of metadata.chains) {
  for (const contract of chain.contracts) {
    const newAbi = artifacts[contract.contractName];
    if (newAbi) {
      contract.abi = newAbi;
      updated++;
    } else {
      console.error(`No forge artifact for contract: ${contract.contractName}`);
      process.exit(1);
    }
  }
}

writeFileSync(metadataPath, JSON.stringify(metadata, null, 2) + '\n', 'utf8');
console.log(`Updated ABIs for ${updated} contracts in ${metadataPath}`);
