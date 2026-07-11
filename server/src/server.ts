import { App } from './app';

const PORT = parseInt(process.env.PORT || '3001', 10);

const server = new App();
server.listen(PORT);
