#!/usr/bin/env node

/**
 * Script para verificar se o baseline está correto
 * 
 * Verifica:
 * - Se o baseline existe
 * - Se o SQL está válido
 * - Se o schema está sincronizado
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PRISMA_DIR = path.join(process.cwd(), 'prisma');
const SCHEMA_FILE = path.join(PRISMA_DIR, 'schema.prisma');
const BASELINE_MIGRATION_DIR = path.join(PRISMA_DIR, 'migrations', '000_init_baseline');

console.log('🔍 Verificando baseline...\n');

let hasErrors = false;

// 1. Verificar se o baseline existe
if (!fs.existsSync(BASELINE_MIGRATION_DIR)) {
  console.error('❌ Baseline não encontrado!');
  console.error(`   Esperado em: ${BASELINE_MIGRATION_DIR}`);
  hasErrors = true;
} else {
  console.log('✅ Diretório do baseline existe');
}

// 2. Verificar se o migration.sql existe
const migrationSql = path.join(BASELINE_MIGRATION_DIR, 'migration.sql');
if (!fs.existsSync(migrationSql)) {
  console.error('❌ migration.sql não encontrado no baseline!');
  hasErrors = true;
} else {
  const sqlContent = fs.readFileSync(migrationSql, 'utf-8');
  const sqlSize = (sqlContent.length / 1024).toFixed(2);
  console.log(`✅ migration.sql existe (${sqlSize} KB)`);
  
  // Verificar se tem conteúdo
  if (sqlContent.trim().length === 0) {
    console.error('❌ migration.sql está vazio!');
    hasErrors = true;
  }
  
  // Verificar se tem CREATE TABLE
  const createTableCount = (sqlContent.match(/CREATE TABLE/gi) || []).length;
  if (createTableCount === 0) {
    console.warn('⚠️  Nenhum CREATE TABLE encontrado no SQL');
  } else {
    console.log(`✅ ${createTableCount} CREATE TABLE encontrados`);
  }
}

// 3. Verificar schema.prisma
if (!fs.existsSync(SCHEMA_FILE)) {
  console.error('❌ schema.prisma não encontrado!');
  hasErrors = true;
} else {
  console.log('✅ schema.prisma existe');
  
  // Tentar validar o schema
  try {
    execSync('npx prisma validate', { stdio: 'pipe' });
    console.log('✅ schema.prisma é válido');
  } catch (error) {
    console.error('❌ schema.prisma tem erros!');
    console.error('   Execute: npx prisma validate');
    hasErrors = true;
  }
}

// 4. Verificar se há migrations além do baseline
const migrationsDir = path.join(PRISMA_DIR, 'migrations');
const migrations = fs.readdirSync(migrationsDir)
  .filter(item => {
    const itemPath = path.join(migrationsDir, item);
    return fs.statSync(itemPath).isDirectory() 
      && item !== '000_init_baseline'
      && item !== '_archived_migrations'
      && !item.startsWith('_');
  });

if (migrations.length > 0) {
  console.log(`\n⚠️  Encontradas ${migrations.length} migrations além do baseline:`);
  migrations.forEach(m => console.log(`   - ${m}`));
  console.log('   Considere arquivá-las se já foram aplicadas.');
} else {
  console.log('✅ Nenhuma migration além do baseline encontrada');
}

// 5. Verificar migrations arquivadas
const archivedDir = path.join(PRISMA_DIR, '_archived_migrations');
if (fs.existsSync(archivedDir)) {
  const archived = fs.readdirSync(archivedDir)
    .filter(item => {
      const itemPath = path.join(archivedDir, item);
      return fs.statSync(itemPath).isDirectory();
    });
  console.log(`\n📦 ${archived.length} migrations arquivadas encontradas`);
} else {
  console.log('\n⚠️  Diretório de migrations arquivadas não existe');
}

console.log('\n' + '='.repeat(50));
if (hasErrors) {
  console.error('❌ Verificação falhou! Corrija os erros acima.');
  process.exit(1);
} else {
  console.log('✅ Verificação concluída com sucesso!');
  process.exit(0);
}

