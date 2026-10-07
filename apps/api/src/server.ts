import { app } from './app.js'; import { env } from './config/env.js'; app.listen(env.PORT,()=>console.log(`BMClub API: http://localhost:${env.PORT}`));
