import { app } from './app.js';

try {
  const address = await app.listen({ port: 3000, host: '0.0.0.0' });
  console.log(`API running on ${address}`);
} catch (error) {
  console.error('Failed to start DashyLife API:', error);
  await app.close();
  process.exitCode = 1;
}
