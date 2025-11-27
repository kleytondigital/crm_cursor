#!/usr/bin/env node

/**
 * Script para criar um baseline completo do Prisma
 * 
 * Este script:
 * 1. Analisa todas as migrations existentes
 * 2. Gera um schema consolidado
 * 3. Cria uma migration baseline única
 * 4. Arquivar migrations antigas
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PRISMA_DIR = path.join(process.cwd(), 'prisma');
const MIGRATIONS_DIR = path.join(PRISMA_DIR, 'migrations');
const ARCHIVED_DIR = path.join(PRISMA_DIR, '_archived_migrations');
const SCHEMA_FILE = path.join(PRISMA_DIR, 'schema.prisma');
const BASELINE_MIGRATION_NAME = '000_init_baseline';
const BASELINE_MIGRATION_DIR = path.join(MIGRATIONS_DIR, BASELINE_MIGRATION_NAME);

console.log('🚀 Iniciando criação do baseline Prisma...\n');

// 1. Verificar se já existe um baseline
if (fs.existsSync(BASELINE_MIGRATION_DIR)) {
  console.error('❌ Erro: Baseline já existe!');
  console.error(`   Diretório: ${BASELINE_MIGRATION_DIR}`);
  console.error('   Se quiser recriar, delete este diretório primeiro.');
  process.exit(1);
}

// 2. Criar diretório de migrations arquivadas se não existir
if (!fs.existsSync(ARCHIVED_DIR)) {
  fs.mkdirSync(ARCHIVED_DIR, { recursive: true });
  console.log('✅ Criado diretório de migrations arquivadas');
}

// 3. Verificar se o schema.prisma existe
if (!fs.existsSync(SCHEMA_FILE)) {
  console.error('❌ Erro: schema.prisma não encontrado!');
  process.exit(1);
}

// 4. Listar migrations existentes (exceto a baseline e arquivadas)
const existingMigrations = fs.readdirSync(MIGRATIONS_DIR)
  .filter(item => {
    const itemPath = path.join(MIGRATIONS_DIR, item);
    return fs.statSync(itemPath).isDirectory() 
      && item !== BASELINE_MIGRATION_NAME
      && item !== '_archived_migrations'
      && !item.startsWith('_');
  })
  .sort();

console.log(`\n📋 Encontradas ${existingMigrations.length} migrations para arquivar:`);
existingMigrations.forEach(m => console.log(`   - ${m}`));

// 5. Gerar o baseline SQL usando Prisma
console.log('\n📦 Gerando baseline SQL...');

try {
  // Criar diretório da migration baseline
  fs.mkdirSync(BASELINE_MIGRATION_DIR, { recursive: true });

  // Gerar SQL do baseline
  const sqlCommand = `npx prisma migrate diff --from-empty --to-schema-datamodel "${SCHEMA_FILE}" --script`;
  console.log(`   Executando: ${sqlCommand}`);
  
  const sqlOutput = execSync(sqlCommand, {
    cwd: process.cwd(),
    encoding: 'utf-8',
    stdio: 'pipe'
  });

  // Salvar o SQL gerado
  const migrationSqlFile = path.join(BASELINE_MIGRATION_DIR, 'migration.sql');
  fs.writeFileSync(migrationSqlFile, sqlOutput);
  console.log(`   ✅ SQL gerado: ${migrationSqlFile}`);

  // Criar arquivo README.md na migration baseline
  const readmeContent = `# Baseline Migration

Esta é a migration inicial que contém toda a estrutura do banco de dados.

## Estado Atual

Esta migration representa o estado completo do schema após todas as ${existingMigrations.length} migrations anteriores serem aplicadas.

## Aplicar em Produção

**IMPORTANTE**: Se você já tem um banco de dados em produção com todas as migrations aplicadas, marque esta migration como aplicada:

\`\`\`bash
npx prisma migrate resolve --applied ${BASELINE_MIGRATION_NAME}
\`\`\`

Isso evitará que o Prisma tente recriar todas as tabelas que já existem.

## Para Novos Ambientes

Em novos ambientes (desenvolvimento, staging), você pode aplicar normalmente:

\`\`\`bash
npx prisma migrate deploy
\`\`\`

## Migrations Arquivadas

As migrations anteriores (${existingMigrations.length} no total) foram arquivadas em:
\`prisma/_archived_migrations/\`

Elas foram mantidas para histórico, mas não serão mais usadas pelo Prisma.
`;

  fs.writeFileSync(path.join(BASELINE_MIGRATION_DIR, 'README.md'), readmeContent);
  console.log('   ✅ README.md criado');

} catch (error) {
  console.error('❌ Erro ao gerar baseline SQL:', error.message);
  // Limpar diretório criado em caso de erro
  if (fs.existsSync(BASELINE_MIGRATION_DIR)) {
    fs.rmSync(BASELINE_MIGRATION_DIR, { recursive: true });
  }
  process.exit(1);
}

// 6. Arquivar migrations antigas
console.log('\n📦 Arquivando migrations antigas...');

const archivedCount = existingMigrations.length;
let archivedSuccessfully = 0;
let archivedErrors = [];

existingMigrations.forEach((migration, index) => {
  const sourcePath = path.join(MIGRATIONS_DIR, migration);
  const destPath = path.join(ARCHIVED_DIR, migration);
  
  if (fs.existsSync(destPath)) {
    console.log(`   ⚠️  Pulando ${migration} (já existe em arquivadas)`);
    archivedSuccessfully++;
  } else {
    try {
      // Tentar renomear primeiro (mais rápido)
      fs.renameSync(sourcePath, destPath);
      console.log(`   ✅ ${index + 1}/${archivedCount} - ${migration}`);
      archivedSuccessfully++;
    } catch (error) {
      if (error.code === 'EPERM' || error.code === 'EBUSY') {
        // Se falhar por permissão, tentar copiar e depois deletar
        try {
          copyRecursiveSync(sourcePath, destPath);
          // Tentar deletar o original (pode falhar se estiver bloqueado)
          try {
            fs.rmSync(sourcePath, { recursive: true, force: true });
          } catch (deleteError) {
            console.log(`   ⚠️  ${index + 1}/${archivedCount} - ${migration} (copiado, mas original não pôde ser deletado - delete manualmente)`);
          }
          console.log(`   ✅ ${index + 1}/${archivedCount} - ${migration} (copiado)`);
          archivedSuccessfully++;
        } catch (copyError) {
          archivedErrors.push(migration);
          console.log(`   ❌ ${index + 1}/${archivedCount} - ${migration} (erro ao arquivar: ${error.message})`);
        }
      } else {
        archivedErrors.push(migration);
        console.log(`   ❌ ${index + 1}/${archivedCount} - ${migration} (erro: ${error.message})`);
      }
    }
  }
});

// Função auxiliar para copiar recursivamente
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

// 7. Criar arquivo de índice das migrations arquivadas
const archivedIndexContent = `# Migrations Arquivadas

Este diretório contém todas as migrations anteriores que foram consolidadas no baseline.

**Total de migrations arquivadas**: ${existingMigrations.length}

**Baseline criado em**: ${new Date().toISOString()}

## Lista de Migrations

${existingMigrations.map((m, i) => `${i + 1}. ${m}`).join('\n')}

## Nota

Estas migrations foram arquivadas após a criação do baseline \`${BASELINE_MIGRATION_NAME}\`.

Elas são mantidas apenas para referência histórica e não são mais usadas pelo Prisma.
`;

fs.writeFileSync(path.join(ARCHIVED_DIR, 'README.md'), archivedIndexContent);
console.log('   ✅ Índice de migrations arquivadas criado');

// Mostrar resumo
console.log(`\n📊 Resumo do arquivamento:`);
console.log(`   ✅ Arquivadas com sucesso: ${archivedSuccessfully}/${archivedCount}`);
if (archivedErrors.length > 0) {
  console.log(`   ❌ Erros ao arquivar: ${archivedErrors.length}`);
  console.log(`   ⚠️  Migrations que precisam ser arquivadas manualmente:`);
  archivedErrors.forEach(m => console.log(`      - ${m}`));
}

// 8. Criar migration_lock.toml na baseline (se necessário)
const lockFile = path.join(MIGRATIONS_DIR, 'migration_lock.toml');
if (!fs.existsSync(lockFile)) {
  const lockContent = `# Please do not edit this file manually
# It should be added to your version control system (i.e. Git)
provider = "postgresql"
`;
  fs.writeFileSync(lockFile, lockContent);
  console.log('   ✅ migration_lock.toml criado');
}

console.log('\n✅ Baseline criado com sucesso!');
console.log('\n📝 Próximos passos:');
console.log('   1. Revise o SQL gerado em: prisma/migrations/000_init_baseline/migration.sql');
console.log('   2. Se o banco já tem as migrations aplicadas, marque como resolvida:');
console.log(`      npx prisma migrate resolve --applied ${BASELINE_MIGRATION_NAME}`);
console.log('   3. Para novos ambientes, simplesmente execute:');
console.log('      npx prisma migrate deploy');
console.log('\n🎉 Baseline completo!');

