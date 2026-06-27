import { registerAs } from '@nestjs/config';

export default registerAs('genieacs', () => ({
  url: process.env.GENIEACS_NBI_URL || 'http://localhost:7557',
  timeout: parseInt(process.env.GENIEACS_TIMEOUT || '5000', 10),
  username: process.env.GENIEACS_USERNAME || '',
  password: process.env.GENIEACS_PASSWORD || '',
}));