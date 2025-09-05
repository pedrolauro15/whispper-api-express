import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import transcriptionRoutes from './routes/transcription.routes';

// Carregar variáveis de ambiente
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares de segurança e logging
app.use(helmet({
  contentSecurityPolicy: false, // Desabilitar CSP para permitir inline scripts no playground
}));
app.use(cors());
app.use(morgan('combined'));

// Servir arquivos estáticos (playground)
app.use(express.static(path.join(__dirname, '../public')));

// Servir arquivos de download/temp
app.use('/download', express.static(path.join(__dirname, '../temp')));

// Middlewares para parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rotas da API
app.use('/api', transcriptionRoutes);

// Rota de health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'whisper-api-express'
  });
});

// Rota principal (playground)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Middleware de erro global
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Erro global:', err);
  res.status(500).json({
    error: 'Erro interno do servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Algo deu errado'
  });
});

// Middleware 404
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Rota não encontrada',
    path: req.originalUrl
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor Express rodando na porta ${PORT}`);
  console.log(`🎮 Playground disponível em http://localhost:${PORT}`);
  console.log(`📚 Health check disponível em http://localhost:${PORT}/api/health`);
  console.log(`�️ API disponível em http://localhost:${PORT}/api/transcribe`);
});

export default app;
