import { Logger } from 'tslog';

const logger = new Logger({
  name: 'EduProof-API',
  minLevel: process.env.NODE_ENV === 'production' ? 'INFO' : 'DEBUG',
});

export { logger };
