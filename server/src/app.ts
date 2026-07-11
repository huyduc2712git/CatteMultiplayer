import express from 'express';
import cors from 'cors';
import { createServer, Server as HttpServer } from 'http';
import { SocketManager } from './managers/SocketManager';

export class App {
  public readonly app: express.Application;
  public readonly httpServer: HttpServer;
  private socketManager = SocketManager.getInstance();

  constructor() {
    this.app = express();
    this.httpServer = createServer(this.app);
    this.config();
    this.routes();
    this.initSocket();
  }

  private config(): void {
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
  }

  private routes(): void {
    this.app.get('/health', (req, res) => {
      res.status(200).json({ status: 'OK', message: 'Catte Game Server is running smoothly' });
    });
  }

  private initSocket(): void {
    this.socketManager.init(this.httpServer);
  }

  public listen(port: number): void {
    this.httpServer.listen(port, () => {
      console.log(`=========================================`);
      console.log(`   Server is listening on port ${port}    `);
      console.log(`=========================================`);
    });
  }
}
