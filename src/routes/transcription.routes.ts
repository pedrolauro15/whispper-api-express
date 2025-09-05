import { Router } from 'express';
import multer from 'multer';
import { TranscriptionController } from '../controllers/transcription.controller';

const router = Router();
const transcriptionController = new TranscriptionController();

// Configuração do multer para upload de arquivos
const upload = multer({
  dest: 'temp/',
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['video/mp4', 'video/avi', 'video/quicktime', 'video/x-msvideo', 
                         'audio/mpeg', 'audio/wav', 'audio/flac'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de arquivo não suportado'));
    }
  }
});

// Middleware para campos multipart (arquivo + translatedSegments)
const uploadFields = upload.fields([
  { name: 'video', maxCount: 1 },
  { name: 'translatedSegments', maxCount: 1 }
]);

// Middleware para upload simples de vídeo
const uploadSingle = upload.single('video');

// Rota para transcrição e geração de vídeo com legendas (endpoint principal do playground)
router.post('/transcribe', 
  uploadSingle,
  transcriptionController.transcribeAndGenerateVideo.bind(transcriptionController)
);

// Rota para gerar vídeo com legendas traduzidas (endpoint original)
router.post('/generate-video-with-translated-subtitles', 
  uploadFields,
  transcriptionController.generateVideoWithTranslatedSubtitles.bind(transcriptionController)
);

// Rota para traduzir uma transcrição existente
router.post('/translate/transcription', 
  transcriptionController.translateTranscription.bind(transcriptionController)
);

// Rota para obter modelos de tradução disponíveis
router.get('/translation/models', 
  transcriptionController.getTranslationModels.bind(transcriptionController)
);

// Rota para obter idiomas de tradução suportados
router.get('/translation/languages', 
  transcriptionController.getTranslationLanguages.bind(transcriptionController)
);

// Rota de teste
router.get('/test', (req, res) => {
  res.json({ 
    message: 'API de transcrição funcionando!',
    timestamp: new Date().toISOString()
  });
});

export default router;
