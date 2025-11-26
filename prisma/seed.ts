import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Verificar se a coluna automationsEnabled existe
  let hasAutomationsEnabled = false;
  try {
    const result = await prisma.$queryRaw<Array<{exists: boolean}>>`
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

  // Criar empresa Sistema para Super Admins
  const systemCompanyData: any = {
    name: 'Sistema',
    slug: 'sistema',
    isActive: true,
  };
  
  if (hasAutomationsEnabled) {
    systemCompanyData.automationsEnabled = false;
  }

  const systemCompany = await prisma.company.upsert({
    where: { slug: 'sistema' },
    update: {},
    create: systemCompanyData,
  });

  // Criar empresa de exemplo
  const companyData: any = {
    name: 'Empresa Exemplo',
    slug: 'exemplo-empresa',
    email: 'contato@exemplo.com',
    phone: '(11) 99999-9999',
    document: '12.345.678/0001-90',
    isActive: true,
  };

  if (hasAutomationsEnabled) {
    companyData.automationsEnabled = false;
  }

  const company = await prisma.company.upsert({
    where: { slug: 'exemplo-empresa' },
    update: {},
    create: companyData,
  });

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
      companyId: systemCompany.id,
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
      companyId: company.id,
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
      companyId: company.id,
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

