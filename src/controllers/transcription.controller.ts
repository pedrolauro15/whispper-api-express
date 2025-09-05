import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { TranslationService } from '../services/translation.service';
import { VideoService } from '../services/video.service';
import { WhisperService, TranscriptionContext } from '../services/whisper.service';

export interface TranslatedSegment {
  start: number;
  end: number;
  text: string;
}

export class TranscriptionController {
  private videoService: VideoService;
  private translationService: TranslationService;
  private whisperService: WhisperService;

  constructor() {
    this.videoService = new VideoService();
    this.translationService = new TranslationService();
    this.whisperService = new WhisperService();
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
      const sourceLanguage = req.body.language || 'auto';
      
      // Preparar contexto para o Whisper
      const context: TranscriptionContext = {
        prompt: req.body.prompt,
        vocabulary: req.body.vocabulary ? JSON.parse(req.body.vocabulary) : undefined,
        topic: req.body.topic,
        speaker: req.body.speaker,
        language: sourceLanguage
      };

      console.log(`🌍 Idioma origem: ${sourceLanguage}, destino: ${targetLanguage}`);

      // Passo 1: Transcrever usando WhisperService melhorado
      console.log('🎙️ Transcrevendo com Whisper...');
      const transcriptionResult = await this.whisperService.transcribeFile(videoFile.path, context);

      // Passo 2: Traduzir segmentos se necessário
      let finalSegments = transcriptionResult.segments;
      let translatedSegments: any[] = [];

      if (targetLanguage !== sourceLanguage && targetLanguage !== 'auto') {
        console.log(`🌍 Traduzindo para ${targetLanguage}...`);
        
        // Traduzir cada segmento individualmente para manter timing
        translatedSegments = await Promise.all(
          transcriptionResult.segments.map(async (segment) => {
            const translatedText = await this.translationService.translateText(
              segment.text,
              targetLanguage,
              sourceLanguage
            );
            
            return {
              ...segment,
              text: translatedText,
              originalText: segment.text
            };
          })
        );
        
        finalSegments = translatedSegments;
      }

      // Converter para formato do VideoService
      const videoSegments: TranslatedSegment[] = finalSegments.map(seg => ({
        start: seg.start,
        end: seg.end,
        text: seg.text
      }));

      console.log(`📝 ${videoSegments.length} segmentos processados`);

      // Passo 3: Gerar vídeo com legendas
      const result = await this.videoService.generateVideoWithSubtitles(
        videoFile.path,
        videoSegments,
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

      // Retornar JSON estruturado com dados detalhados
      res.json({
        success: true,
        message: 'Vídeo processado com sucesso!',
        originalFile: videoFile.originalname,
        targetLanguage: targetLanguage,
        sourceLanguage: sourceLanguage,
        transcription: {
          text: transcriptionResult.text,
          segments: transcriptionResult.segments,
          language: transcriptionResult.language,
          translatedSegments: translatedSegments.length > 0 ? translatedSegments : undefined
        },
        video: {
          downloadUrl: `/download/${downloadFileName}`,
          fileName: downloadFileName
        },
        stats: {
          duration: transcriptionResult.duration || 0,
          originalSegments: transcriptionResult.segments.length,
          translatedSegments: translatedSegments.length,
          segments: finalSegments.length
        }
      });

      // Limpar arquivos temporários após um tempo
      setTimeout(() => {
        if (fs.existsSync(videoFile.path)) {
          fs.unlinkSync(videoFile.path);
        }
        if (fs.existsSync(result.outputPath!)) {
          fs.unlinkSync(result.outputPath!);
        }
      }, 60000); // 1 minuto para download

    } catch (error: any) {
      console.error('❌ Erro na transcrição:', error);

      // Limpar arquivos temporários em caso de erro
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
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

  /**
   * Endpoint para traduzir uma transcrição existente
   */
  async translateTranscription(req: Request, res: Response): Promise<void> {
    try {
      console.log('🌐 Iniciando tradução de transcrição...');
      
      const { text, sourceLanguage = 'auto', targetLanguage, model = 'google' } = req.body;

      if (!text || !targetLanguage) {
        res.status(400).json({ 
          error: 'Texto e idioma de destino são obrigatórios',
          detail: 'Campos "text" e "targetLanguage" devem ser fornecidos'
        });
        return;
      }

      console.log(`🔤 Traduzindo texto de ${sourceLanguage} para ${targetLanguage}`);
      console.log(`📝 Texto original: ${text.substring(0, 100)}${text.length > 100 ? '...' : ''}`);

      // Traduzir texto usando o serviço de tradução
      const translatedText = await this.translationService.translateText(
        text,
        targetLanguage,
        sourceLanguage
      );

      res.json({
        success: true,
        message: 'Tradução concluída com sucesso!',
        translation: {
          originalText: text,
          translatedText: translatedText,
          sourceLanguage: sourceLanguage,
          targetLanguage: targetLanguage,
          model: model
        },
        stats: {
          originalLength: text.length,
          translatedLength: translatedText.length
        }
      });

    } catch (error: any) {
      console.error('❌ Erro na tradução de transcrição:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor', 
        message: error.message 
      });
    }
  }

  /**
   * Endpoint para obter modelos de tradução disponíveis
   */
  async getTranslationModels(req: Request, res: Response): Promise<void> {
    try {
      console.log('📋 Obtendo modelos de tradução disponíveis...');
      
      const models = await this.translationService.getAvailableModels();
      
      res.json({
        message: 'Modelos de tradução disponíveis',
        models: models,
        defaultModel: 'llama3.1:8b',
        ollamaAvailable: await this.translationService.isOllamaAvailable()
      });

    } catch (error: any) {
      console.error('❌ Erro ao obter modelos de tradução:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor', 
        message: error.message 
      });
    }
  }

  /**
   * Endpoint para obter idiomas de tradução suportados
   */
  async getTranslationLanguages(req: Request, res: Response): Promise<void> {
    try {
      const languages = this.translationService.getSupportedLanguages();

      res.json({
        message: 'Idiomas de tradução suportados',
        languages: languages,
        totalLanguages: languages.length
      });

    } catch (error: any) {
      console.error('❌ Erro ao obter idiomas de tradução:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor', 
        message: error.message 
      });
    }
  }
}
