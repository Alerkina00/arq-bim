'use strict';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-secret';
if (process.env.NODE_ENV === 'production' && JWT_SECRET === 'dev-only-secret') {
  console.error('❌ JWT_SECRET deve ser definido em produção!');
  process.exit(1);
}

module.exports = { JWT_SECRET };
