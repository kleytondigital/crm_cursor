#!/usr/bin/env node

/**
 * Script para arquivar a última migration que pode ter ficado para trás
 * devido a erros de permissão no Windows
 */

const fs = require('fs');
const path = require('path');

const MIGRATIONS_DIR = path.join(process.cwd(), 'prisma', 'migrations');
const ARCHIVED_DIR = path.join(process.cwd(), 'prisma', '_archived_migrations');

const remainingMigration = '20251123171246_add_lead_origin_field';
const sourcePath = path.join(MIGRATIONS_DIR, remainingMigration);
const destPath = path.join(ARCHIVED_DIR, remainingMigration);

console.log('🔍 Verificando migration restante...\n');

if (!fs.existsSync(sourcePath)) {
  console.log('✅ Nenhuma migration restante encontrada.');
  console.log('   Todas as migrations já foram arquivadas.');
  process.exit(0);
}

if (fs.existsSync(destPath)) {
  console.log(`⚠️  A migration ${remainingMigration} já existe em arquivadas.`);
  console.log('   Deletando da pasta de migrations...');
  
  try {
    fs.rmSync(sourcePath, { recursive: true, force: true });
    console.log('   ✅ Removida da pasta de migrations.');
  } catch (error) {
    console.error('   ❌ Erro ao remover:', error.message);
    console.log('   💡 Tente deletar manualmente ou fechar programas que possam estar usando o arquivo.');
  }
  process.exit(0);
}

console.log(`📦 Arquivando ${remainingMigration}...`);

// Tentar copiar primeiro
function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  
  if (isDirectory) {
    fs.mkdirSync(dest, { recursive: true });
    fs.readdirSync(src).forEach(childItemName => {
      copyRecursiveSync(
        path.join(src, childItemName),
        path.join(dest, childItemName)
      );
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

try {
  // Garantir que o diretório de arquivo existe
  if (!fs.existsSync(ARCHIVED_DIR)) {
    fs.mkdirSync(ARCHIVED_DIR, { recursive: true });
  }
  
  // Copiar
  copyRecursiveSync(sourcePath, destPath);
  console.log('   ✅ Copiada para arquivadas.');
  
  // Tentar deletar original
  try {
    fs.rmSync(sourcePath, { recursive: true, force: true });
    console.log('   ✅ Removida da pasta de migrations.');
    console.log('\n✅ Migration arquivada com sucesso!');
  } catch (deleteError) {
    console.log('   ⚠️  Copiada, mas não foi possível deletar o original.');
    console.log('   💡 Delete manualmente: ' + sourcePath);
    console.log('   💡 Ou feche programas que possam estar usando o arquivo.');
  }
} catch (error) {
  console.error('❌ Erro ao arquivar:', error.message);
  console.log('\n💡 Tente arquivar manualmente:');
  console.log(`   Copie: ${sourcePath}`);
  console.log(`   Para: ${destPath}`);
  process.exit(1);
}

