// Seed compilado - não edite este arquivo diretamente
// Edite prisma/seed.ts e recompile com: npx tsc prisma/seed.ts --outDir prisma --module commonjs --esModuleInterop --resolveJsonModule --skipLibCheck
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  // Verificar se a coluna automationsEnabled existe
  let hasAutomationsEnabled = false;
  try {
    const result = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'companies' 
        AND column_name = 'automationsEnabled'
      ) as exists
    `;
    hasAutomationsEnabled = result[0]?.exists ?? false;
  } catch (error) {
    console.warn('Não foi possível verificar se a coluna automationsEnabled existe. Continuando...');
  }

  // Criar empresa Sistema para Super Admins usando SQL direto se a coluna não existir
  let systemCompanyId;
  if (!hasAutomationsEnabled) {
    // Verificar se já existe
    const existing = await prisma.$queryRaw`
      SELECT id FROM companies WHERE slug = 'sistema' LIMIT 1
    `;
    
    if (existing[0]?.id) {
      systemCompanyId = existing[0].id;
    } else {
      // Criar usando SQL direto para evitar erro do Prisma Client quando a coluna não existe
      const result = await prisma.$queryRaw`
        INSERT INTO companies (id, name, slug, "isActive", "createdAt", "updatedAt")
        VALUES (gen_random_uuid(), 'Sistema', 'sistema', true, NOW(), NOW())
        RETURNING id
      `;
      systemCompanyId = result[0]?.id || '';
    }
  } else {
    const systemCompany = await prisma.company.upsert({
      where: { slug: 'sistema' },
      update: {},
      create: {
        name: 'Sistema',
        slug: 'sistema',
        isActive: true,
        automationsEnabled: false,
      },
    });
    systemCompanyId = systemCompany.id;
  }

  // Criar empresa de exemplo usando SQL direto se a coluna não existir
  let companyId;
  if (!hasAutomationsEnabled) {
    // Verificar se já existe
    const existing = await prisma.$queryRaw`
      SELECT id FROM companies WHERE slug = 'exemplo-empresa' LIMIT 1
    `;
    
    if (existing[0]?.id) {
      companyId = existing[0].id;
    } else {
      // Criar usando SQL direto para evitar erro do Prisma Client quando a coluna não existe
      const result = await prisma.$queryRaw`
        INSERT INTO companies (id, name, slug, email, phone, document, "isActive", "createdAt", "updatedAt")
        VALUES (
          gen_random_uuid(), 
          'Empresa Exemplo', 
          'exemplo-empresa', 
          'contato@exemplo.com',
          '(11) 99999-9999',
          '12.345.678/0001-90',
          true, 
          NOW(), 
          NOW()
        )
        RETURNING id
      `;
      companyId = result[0]?.id || '';
    }
  } else {
    const company = await prisma.company.upsert({
      where: { slug: 'exemplo-empresa' },
      update: {},
      create: {
        name: 'Empresa Exemplo',
        slug: 'exemplo-empresa',
        email: 'contato@exemplo.com',
        phone: '(11) 99999-9999',
        document: '12.345.678/0001-90',
        isActive: true,
        automationsEnabled: false,
      },
    });
    companyId = company.id;
  }

  // Criar Super Admin
  const superAdminPassword = await bcrypt.hash('superadmin123', 10);
  await prisma.user.upsert({
    where: { email: 'superadmin@exemplo.com' },
    update: {},
    create: {
      email: 'superadmin@exemplo.com',
      password: superAdminPassword,
      name: 'Super Administrador',
      role: 'SUPER_ADMIN',
      companyId: systemCompanyId,
      isActive: true,
    },
  });

  // Criar usuário admin
  const hashedPassword = await bcrypt.hash('123456', 10);

  await prisma.user.upsert({
    where: { email: 'admin@exemplo.com' },
    update: {},
    create: {
      email: 'admin@exemplo.com',
      password: hashedPassword,
      name: 'Administrador',
      role: 'ADMIN',
      companyId: companyId,
      isActive: true,
    },
  });

  // Criar usuário comum
  await prisma.user.upsert({
    where: { email: 'user@exemplo.com' },
    update: {},
    create: {
      email: 'user@exemplo.com',
      password: hashedPassword,
      name: 'Usuário Comum',
      role: 'USER',
      companyId: companyId,
      isActive: true,
    },
  });

  // Estágios padrão do pipeline agora são criados pela migration após os status customizados
  // Os estágios devem ser criados manualmente através da interface após criar os status customizados

  console.log('Seed executado com sucesso!');
  console.log('================================');
  console.log('Credenciais criadas:');
  console.log('Super Admin:');
  console.log('  Email: superadmin@exemplo.com');
  console.log('  Senha: superadmin123');
  console.log('Admin:');
  console.log('  Email: admin@exemplo.com');
  console.log('  Senha: 123456');
  console.log('Usuário:');
  console.log('  Email: user@exemplo.com');
  console.log('  Senha: 123456');
  console.log('================================');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
