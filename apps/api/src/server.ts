
import { app } from './app.js';
import { env } from './config/env.js';

app.listen(env.PORT, env.API_HOST, () => {
  console.log('');
  console.log('======================================');
  console.log(' BMClub API iniciada');
  console.log('======================================');
  console.log(` Porta: ${env.PORT}`);
  console.log(` Local: http://localhost:${env.PORT}`);
  console.log(` Rede:  http://${env.API_PUBLIC_HOST}:${env.PORT}`);
  console.log('======================================');
  console.log('');
});
