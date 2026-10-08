import { app } from './app.js';
import { env } from './config/env.js';

app.listen(env.PORT, '0.0.0.0', () => {
  console.log('');
  console.log('======================================');
  console.log(' BMClub API iniciada');
  console.log('======================================');
  console.log(` Porta: ${env.PORT}`);
  console.log(` Local: http://localhost:${env.PORT}`);
  console.log(` Rede:  http://192.168.0.87:${env.PORT}`);
  console.log('======================================');
  console.log('');
});