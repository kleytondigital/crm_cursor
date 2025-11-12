const bcrypt = require('bcrypt');

async function generateHash() {
  const password = 'superadmin123';
  const hash = await bcrypt.hash(password, 10);
  console.log('================================');
  console.log('Senha:', password);
  console.log('Hash bcrypt:', hash);
  console.log('================================');
  console.log('\nSQL para atualizar a senha:');
  console.log(`UPDATE users SET password = '${hash}' WHERE email = 'superadmin@exemplo.com';`);
}

generateHash().catch(console.error);




