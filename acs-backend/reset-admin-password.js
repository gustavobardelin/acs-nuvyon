const bcrypt = require('bcrypt');

const password = process.argv[2];

if (!password) {
  console.error('Uso: node reset-admin-password.js "SUA_SENHA"');
  process.exit(1);
}

(async () => {
  const hash = await bcrypt.hash(password, 12);

  console.log(hash);
})();
