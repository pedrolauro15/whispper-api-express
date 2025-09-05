import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { VideoService } from '../services/video.service';
import { TranslationService } from '../services/translation.service';

export interface TranslatedSegment {
  start: number;
  end: number;
  text: string;
}

export class TranscriptionController {
  private videoService: VideoService;
  private translationService: TranslationService;

  constructor() {
    this.videoService = new VideoService();
    this.translationService = new TranslationService();
  }

  async transcribeAndGenerateVideo(req: Request, res: Response): Promise<void> {
    try {
      console.log('🎙️ Iniciando transcrição e geração de vídeo');

      // Verificar se o arquivo foi enviado
      const videoFile = req.file;

      if (!videoFile) {
        res.status(400).json({
          error: 'Nenhum arquivo de vídeo enviado',
          detail: 'Campo "video" é obrigatório'
        });
        return;
      }

      console.log(`✅ Arquivo recebido: ${videoFile.originalname} (${videoFile.mimetype})`);

      const targetLanguage = req.body.targetLanguage || 'pt';
      console.log(`🌍 Idioma de destino: ${targetLanguage}`);

      // Passo 1: Extrair áudio do vídeo
      console.log('🎵 Extraindo áudio do vídeo...');
      const audioPath = await this.translationService.extractAudioFromVideo(videoFile.path);

      // Passo 2: Transcrever áudio (simulado por enquanto)
      console.log('🎙️ Transcrevendo áudio...');
      const transcriptionSegments = await this.translationService.transcribeAudio(audioPath);

      // Passo 3: Traduzir segmentos para o idioma de destino
      console.log(`🌍 Traduzindo para ${targetLanguage}...`);
      const translationResult = await this.translationService.translateSegments(
        transcriptionSegments, 
        targetLanguage
      );

      if (!translationResult.success) {
        // Limpar arquivos temporários
        fs.unlinkSync(videoFile.path);
        if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
        
        res.status(500).json({
          error: 'Falha na tradução',
          detail: translationResult.message
        });
        return;
      }

      // Converter para formato esperado pelo VideoService
      const translatedSegments: TranslatedSegment[] = translationResult.segments!.map(seg => ({
        start: seg.start,
        end: seg.end,
        text: seg.translatedText || seg.originalText
      }));

      console.log(`📝 ${translatedSegments.length} segmentos traduzidos`);

      // Gerar vídeo com as legendas
      const result = await this.videoService.generateVideoWithSubtitles(
        videoFile.path,
        translatedSegments,
        {
          fontName: 'Arial',
          fontSize: 20,
          fontColor: '#ffffff',
          backgroundColor: '#000000cc',
          borderWidth: 1,
          borderColor: '#000000',
          marginVertical: 50
        }
      );

      if (!result.success) {
        // Limpar arquivo temporário
        fs.unlinkSync(videoFile.path);
        
        res.status(500).json({
          error: 'Falha ao gerar vídeo com legendas',
          detail: result.message
        });
        return;
      }

      console.log('✅ Vídeo processado com sucesso!');

      // Mover o arquivo para a pasta de download com nome padronizado
      const downloadFileName = `${videoFile.originalname.replace(/\.[^/.]+$/, '')}_with_subtitles.mp4`;
      const downloadPath = path.join(__dirname, '../../temp', downloadFileName);
      
      // Copiar arquivo para o local de download
      fs.copyFileSync(result.outputPath!, downloadPath);
      
      console.log(`📁 Arquivo copiado para: ${downloadPath}`);

      // Retornar JSON com informações do resultado (para o playground)
      res.json({
        success: true,
        originalFile: videoFile.originalname,
        targetLanguage: targetLanguage,
        duration: `${Math.max(...translatedSegments.map(s => s.end))}s`,
        segmentsCount: translatedSegments.length,
        transcription: translatedSegments,
        outputPath: `/download/${downloadFileName}`,
        message: 'Vídeo processado com sucesso!'
      });

      // Limpar arquivos temporários após um tempo
      setTimeout(() => {
        if (fs.existsSync(videoFile.path)) {
          fs.unlinkSync(videoFile.path);
        }
        if (fs.existsSync(audioPath)) {
          fs.unlinkSync(audioPath);
        }
        if (fs.existsSync(result.outputPath!)) {
          fs.unlinkSync(result.outputPath!);
        }
      }, 30000); // 30 segundos para download

    } catch (error: any) {
      console.error('❌ Erro na transcrição:', error);

      // Limpar arquivos temporários em caso de erro
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      // Tentar limpar áudio extraído se existir
      try {
        const possibleAudioPath = req.file?.path.replace(/\.[^/.]+$/, '_audio.wav');
        if (possibleAudioPath && fs.existsSync(possibleAudioPath)) {
          fs.unlinkSync(possibleAudioPath);
        }
      } catch (cleanupError) {
        console.warn('⚠️ Erro na limpeza de arquivos:', cleanupError);
      }

      res.status(500).json({
        error: 'Erro interno do servidor',
        detail: error.message
      });
    }
  }

  async generateVideoWithTranslatedSubtitles(req: Request, res: Response): Promise<void> {
    try {
      console.log('🎬 Iniciando geração de vídeo com legendas traduzidas');

      // Verificar se o arquivo foi enviado
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const videoFile = files?.video?.[0];

      if (!videoFile) {
        res.status(400).json({
          error: 'Nenhum arquivo de vídeo enviado',
          detail: 'Campo "video" é obrigatório'
        });
        return;
      }

      console.log(`✅ Arquivo recebido: ${videoFile.originalname} (${videoFile.mimetype})`);

      // Obter segmentos traduzidos do body
      let translatedSegments: TranslatedSegment[] = [];

      // Tentar obter dos campos do formulário
      if (req.body.translatedSegments) {
        try {
          translatedSegments = typeof req.body.translatedSegments === 'string' 
            ? JSON.parse(req.body.translatedSegments)
            : req.body.translatedSegments;
          
          console.log(`📝 Segmentos recebidos via body: ${translatedSegments.length} itens`);
        } catch (parseError) {
          console.error('❌ Erro ao fazer parse dos segmentos:', parseError);
          res.status(400).json({
            error: 'Erro ao processar segmentos traduzidos',
            detail: 'Os segmentos devem estar em formato JSON válido'
          });
          return;
        }
      }

      // Se não recebeu segmentos, usar mock para teste
      if (!translatedSegments || translatedSegments.length === 0) {
        console.warn('⚠️ Nenhum segmento recebido, usando dados mock para teste');
        translatedSegments = [
          { start: 0, end: 3, text: "Este é um teste de legenda traduzida via Express" },
          { start: 3, end: 6, text: "Segunda parte do teste com Express e Multer" },
          { start: 6, end: 9, text: "Terceira e última parte do teste mock" }
        ];
      }

      console.log(`🎯 Processando ${translatedSegments.length} segmentos traduzidos`);

      // Gerar vídeo com legendas
      const result = await this.videoService.generateVideoWithSubtitles(
        videoFile.path,
        translatedSegments,
        {
          fontName: 'Arial',
          fontSize: 18,
          fontColor: '#ffffff',
          backgroundColor: '#000000',
          borderWidth: 1,
          borderColor: '#000000',
          marginVertical: 20
        }
      );

      if (!result.success) {
        // Limpar arquivo temporário
        fs.unlinkSync(videoFile.path);
        
        res.status(500).json({
          error: 'Falha ao gerar vídeo com legendas',
          detail: result.message
        });
        return;
      }

      console.log('✅ Vídeo com legendas gerado com sucesso!');

      // Preparar response para download
      const fileName = videoFile.originalname.replace(/\.[^/.]+$/, '_with_subtitles.mp4');

      res.setHeader('Content-Type', 'video/mp4');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

      // Enviar arquivo e limpar temporários
      res.sendFile(result.outputPath!, (err) => {
        // Limpar arquivos temporários após envio
        fs.unlinkSync(videoFile.path);
        if (result.outputPath && fs.existsSync(result.outputPath)) {
          fs.unlinkSync(result.outputPath);
        }

        if (err) {
          console.error('❌ Erro ao enviar arquivo:', err);
        }
      });

    } catch (error: any) {
      console.error('❌ Erro na geração de vídeo:', error);

      // Limpar arquivo temporário em caso de erro
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const videoFile = files?.video?.[0];
      if (videoFile && fs.existsSync(videoFile.path)) {
        fs.unlinkSync(videoFile.path);
      }

      res.status(500).json({
        error: 'Erro interno do servidor',
        detail: error.message
      });
    }
  }
}
