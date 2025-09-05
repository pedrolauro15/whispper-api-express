import axios from 'axios';

export interface TranslationSegment {
  start: number;
  end: number;
  originalText: string;
  translatedText?: string;
}

export interface TranslationResult {
  success: boolean;
  message: string;
  segments?: TranslationSegment[];
}

export class TranslationService {
  
  /**
   * Simula transcrição de áudio usando Whisper
   * Em produção, integraria com OpenAI Whisper ou similar
   */
  async transcribeAudio(audioPath: string, sourceLanguage: string = 'auto'): Promise<TranslationSegment[]> {
    console.log(`🎙️ Simulando transcrição de áudio: ${audioPath} (idioma: ${sourceLanguage})`);
    
    // TODO: Integrar com Whisper real
    // const whisperResult = await openai.audio.transcriptions.create({
    //   file: fs.createReadStream(audioPath),
    //   model: "whisper-1",
    //   response_format: "verbose_json",
    //   timestamp_granularities: ["segment"]
    // });

    // Por enquanto, simulamos segmentos baseados em duração estimada
    const mockSegments: TranslationSegment[] = [
      { start: 0, end: 3, originalText: "Hello, this is a sample transcription" },
      { start: 3, end: 6, originalText: "This is the second part of the audio" },
      { start: 6, end: 9, originalText: "And this is the final segment" },
      { start: 9, end: 12, originalText: "Thank you for listening" }
    ];

    console.log(`📝 Mock transcription: ${mockSegments.length} segmentos gerados`);
    return mockSegments;
  }

  /**
   * Traduz texto usando serviço de tradução
   * Implementa múltiplas opções de tradução
   */
  async translateSegments(
    segments: TranslationSegment[], 
    targetLanguage: string,
    sourceLanguage: string = 'auto'
  ): Promise<TranslationResult> {
    try {
      console.log(`🌍 Traduzindo ${segments.length} segmentos para ${targetLanguage}`);

      const translatedSegments: TranslationSegment[] = [];

      for (const segment of segments) {
        const translatedText = await this.translateText(
          segment.originalText, 
          sourceLanguage, 
          targetLanguage
        );

        translatedSegments.push({
          ...segment,
          translatedText
        });
      }

      return {
        success: true,
        message: `Tradução concluída para ${targetLanguage}`,
        segments: translatedSegments
      };

    } catch (error: any) {
      console.error('❌ Erro na tradução:', error);
      return {
        success: false,
        message: `Erro na tradução: ${error.message}`
      };
    }
  }

  /**
   * Traduz um texto individual
   * Usa múltiplas estratégias de tradução
   */
  private async translateText(
    text: string, 
    sourceLanguage: string, 
    targetLanguage: string
  ): Promise<string> {
    
    // Estratégia 1: Tentar Google Translate (gratuito via API não oficial)
    try {
      const translation = await this.translateWithGoogle(text, sourceLanguage, targetLanguage);
      if (translation) {
        return translation;
      }
    } catch (error) {
      console.warn('⚠️ Google Translate falhou, tentando estratégia alternativa');
    }

    // Estratégia 2: Tradução baseada em dicionário simples
    return this.translateWithDictionary(text, targetLanguage);
  }

  /**
   * Tradução usando Google Translate (API não oficial)
   */
  private async translateWithGoogle(
    text: string, 
    sourceLanguage: string, 
    targetLanguage: string
  ): Promise<string | null> {
    try {
      // Usando API pública do Google Translate
      const url = 'https://translate.googleapis.com/translate_a/single';
      const params = {
        client: 'gtx',
        sl: sourceLanguage === 'auto' ? 'en' : sourceLanguage,
        tl: targetLanguage,
        dt: 't',
        q: text
      };

      const response = await axios.get(url, { 
        params, 
        timeout: 5000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; TranslationBot/1.0)'
        }
      });

      if (response.data && response.data[0] && response.data[0][0]) {
        const translatedText = response.data[0][0][0];
        console.log(`✅ Google Translate: "${text}" -> "${translatedText}"`);
        return translatedText;
      }

      return null;
    } catch (error) {
      console.error('❌ Erro no Google Translate:', error);
      return null;
    }
  }

  /**
   * Tradução usando dicionário básico (fallback)
   */
  private translateWithDictionary(text: string, targetLanguage: string): string {
    console.log(`📚 Usando tradução por dicionário para: ${targetLanguage}`);

    const translations: { [key: string]: { [key: string]: string } } = {
      'pt': {
        'hello': 'olá',
        'this': 'este',
        'is': 'é',
        'a': 'um',
        'sample': 'exemplo',
        'transcription': 'transcrição',
        'second': 'segunda',
        'part': 'parte',
        'audio': 'áudio',
        'final': 'final',
        'segment': 'segmento',
        'thank': 'obrigado',
        'you': 'você',
        'for': 'por',
        'listening': 'ouvir',
        'and': 'e',
        'of': 'de',
        'the': 'o'
      },
      'es': {
        'hello': 'hola',
        'this': 'este',
        'is': 'es',
        'a': 'un',
        'sample': 'ejemplo',
        'transcription': 'transcripción',
        'second': 'segunda',
        'part': 'parte',
        'audio': 'audio',
        'final': 'final',
        'segment': 'segmento',
        'thank': 'gracias',
        'you': 'tú',
        'for': 'por',
        'listening': 'escuchar',
        'and': 'y',
        'of': 'de',
        'the': 'el'
      },
      'fr': {
        'hello': 'bonjour',
        'this': 'ce',
        'is': 'est',
        'a': 'un',
        'sample': 'exemple',
        'transcription': 'transcription',
        'second': 'deuxième',
        'part': 'partie',
        'audio': 'audio',
        'final': 'final',
        'segment': 'segment',
        'thank': 'merci',
        'you': 'vous',
        'for': 'pour',
        'listening': 'écouter',
        'and': 'et',
        'of': 'de',
        'the': 'le'
      }
    };

    const dictionary = translations[targetLanguage];
    if (!dictionary) {
      console.warn(`⚠️ Dicionário não disponível para ${targetLanguage}, retornando texto original`);
      return text;
    }

    // Tradução palavra por palavra (básica)
    const words = text.toLowerCase().split(/\s+/);
    const translatedWords = words.map(word => {
      const cleanWord = word.replace(/[^\w]/g, '');
      return dictionary[cleanWord] || word;
    });

    const result = translatedWords.join(' ');
    console.log(`📝 Tradução dicionário: "${text}" -> "${result}"`);
    
    return result;
  }

  /**
   * Extrai áudio de um vídeo para transcrição
   */
  async extractAudioFromVideo(videoPath: string): Promise<string> {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    const audioPath = videoPath.replace(/\.[^/.]+$/, '_audio.wav');
    
    try {
      console.log('🎵 Extraindo áudio do vídeo...');
      
      const command = `ffmpeg -i "${videoPath}" -ac 1 -ar 16000 -y "${audioPath}"`;
      await execAsync(command);
      
      console.log(`✅ Áudio extraído: ${audioPath}`);
      return audioPath;
      
    } catch (error: any) {
      console.error('❌ Erro ao extrair áudio:', error);
      throw new Error(`Falha na extração de áudio: ${error.message}`);
    }
  }

  /**
   * Detecta idioma do texto automaticamente
   */
  async detectLanguage(text: string): Promise<string> {
    // Implementação básica de detecção de idioma
    const portuguese = /[àáâãçéêíóôõú]/i;
    const spanish = /[ñáéíóúü]/i;
    const french = /[àâäéèêëïîôùûüÿç]/i;
    
    if (portuguese.test(text)) return 'pt';
    if (spanish.test(text)) return 'es';
    if (french.test(text)) return 'fr';
    
    return 'en'; // Default para inglês
  }
}
