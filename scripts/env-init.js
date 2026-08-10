#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const envPath = path.join(root, '.env');
const examplePath = path.join(root, '.env.example');

if (fs.existsSync(envPath)) {
  console.log('==> .env already exists, skipping creation');
  process.exit(0);
}

if (!fs.existsSync(examplePath)) {
  console.error(`==> .env.example not found at ${examplePath}`);
  process.exit(1);
}

fs.copyFileSync(examplePath, envPath);
console.log('==> Created .env from .env.example');
console.log('    IMPORTANT: fill real values (JWT secrets, postgres password, etc.)');