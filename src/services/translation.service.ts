import axios from 'axios';
import { Ollama } from 'ollama';

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

export interface TranslationOptions {
  targetLanguage: string;
  sourceLanguage?: string;
  model?: string;
}

export class TranslationService {
  private ollama: Ollama;
  
  constructor() {
    // Configurar Ollama para o servidor correto
    this.ollama = new Ollama({ 
      host: process.env.OLLAMA_HOST || 'http://caucaia.saudehd.com.br:11434' 
    });
  }

  private readonly supportedModels = {
    'llama3.1:8b': {
      name: 'Llama 3.1 8B',
      description: 'Modelo rápido e eficiente para traduções gerais',
      temperature: 0.3,
      top_p: 0.9
    },
    'llama3.1:70b': {
      name: 'Llama 3.1 70B',
      description: 'Modelo mais poderoso para traduções complexas',
      temperature: 0.2,
      top_p: 0.8
    },
    'llama3.2:3b': {
      name: 'Llama 3.2 3B',
      description: 'Modelo compacto e rápido',
      temperature: 0.4,
      top_p: 0.9
    },
    'qwen2.5:7b': {
      name: 'Qwen 2.5 7B',
      description: 'Modelo Qwen especializado em múltiplas linguagens',
      temperature: 0.3,
      top_p: 0.9
    }
  };
  
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

    try {
      const fs = require('fs');
      
      // Verificar se o arquivo de áudio existe
      if (!fs.existsSync(audioPath)) {
        throw new Error(`Arquivo de áudio não encontrado: ${audioPath}`);
      }

      // Calcular duração estimada baseada no tamanho do arquivo (aproximação)
      const stats = fs.statSync(audioPath);
      const fileSizeKB = stats.size / 1024;
      const estimatedDuration = Math.max(9, Math.min(60, Math.round(fileSizeKB / 256))); // Estimativa baseada no tamanho
      
      console.log(`📊 Arquivo de áudio: ${fileSizeKB.toFixed(2)} KB, duração estimada: ${estimatedDuration}s`);
      
      // Gerar segmentos baseados na duração estimada
      const segmentDuration = 3; // 3 segundos por segmento
      const numSegments = Math.ceil(estimatedDuration / segmentDuration);
      
      const mockSegments: TranslationSegment[] = [];
      
      for (let i = 0; i < numSegments; i++) {
        const start = i * segmentDuration;
        const end = Math.min((i + 1) * segmentDuration, estimatedDuration);
        
        // Textos mock mais variados
        const mockTexts = [
          "Hello, this is a sample transcription from the audio",
          "This is the second part of the audio content",
          "Here we continue with more audio transcription",
          "This segment contains more spoken content",
          "The audio continues with additional information",
          "This is another part of the transcribed audio",
          "More content is being transcribed from the audio",
          "The transcription continues with this segment",
          "Additional audio content is transcribed here",
          "This is the final part of the audio transcription"
        ];
        
        mockSegments.push({
          start,
          end,
          originalText: mockTexts[i % mockTexts.length] || `Audio segment ${i + 1} transcribed content`
        });
      }

      console.log(`📝 Mock transcription: ${mockSegments.length} segmentos gerados (${estimatedDuration}s total)`);
      return mockSegments;
      
    } catch (error: any) {
      console.error('❌ Erro na transcrição simulada:', error);
      
      // Fallback para segmentos padrão
      const fallbackSegments: TranslationSegment[] = [
        { start: 0, end: 3, originalText: "Sample transcription from uploaded audio" },
        { start: 3, end: 6, originalText: "This is the second part of the audio" },
        { start: 6, end: 9, originalText: "Final segment of the transcribed content" }
      ];
      
      console.log(`⚠️ Usando segmentos fallback: ${fallbackSegments.length} itens`);
      return fallbackSegments;
    }
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
   * Usa múltiplas estratégias de tradução: Ollama -> Google -> Dicionário
   */
  async translateText(
    text: string, 
    targetLanguage: string,
    sourceLanguage: string = 'auto',
    model: string = 'llama3.1:8b'
  ): Promise<string> {
    
    // Estratégia 1: Tentar Ollama (modelo local de IA)
    try {
      const translation = await this.translateWithOllama(text, sourceLanguage, targetLanguage, model);
      if (translation) {
        return translation;
      }
    } catch (error) {
      console.warn('⚠️ Ollama falhou, tentando Google Translate');
    }
    
    // Estratégia 2: Tentar Google Translate (gratuito via API não oficial)
    try {
      const translation = await this.translateWithGoogle(text, sourceLanguage, targetLanguage);
      if (translation) {
        return translation;
      }
    } catch (error) {
      console.warn('⚠️ Google Translate falhou, usando dicionário local');
    }

    // Estratégia 3: Tradução baseada em dicionário simples
    return this.translateWithDictionary(text, targetLanguage);
  }

  /**
   * Tradução usando Ollama (modelo local de IA)
   */
  private async translateWithOllama(
    text: string,
    sourceLanguage: string,
    targetLanguage: string,
    model: string = 'llama3.1:8b'
  ): Promise<string | null> {
    try {
      if (!text || text.trim() === '') {
        return '';
      }

      const sourceLang = this.getLanguageName(sourceLanguage);
      const targetLang = this.getLanguageName(targetLanguage);
      const modelConfig = this.supportedModels[model as keyof typeof this.supportedModels];

      console.log(`🤖 Traduzindo com Ollama: ${sourceLang} -> ${targetLang} (${model})`);

      const prompt = `You are a professional translator. Translate the following text from ${sourceLang} to ${targetLang}.

IMPORTANT INSTRUCTIONS:
- Only return the translated text, nothing else
- Maintain the original formatting and punctuation
- Keep technical terms when appropriate
- Preserve proper nouns unless they have standard translations
- Ensure natural and fluent translation in the target language
- Do not add explanations or comments

Text to translate:
"${text}"`;

      const response = await this.ollama.generate({
        model,
        prompt,
        stream: false,
        options: {
          temperature: modelConfig?.temperature || 0.3,
          top_p: modelConfig?.top_p || 0.9,
          num_predict: -1
        }
      });

      const translatedText = response.response.trim();
      
      if (translatedText && translatedText !== text) {
        console.log(`✅ Ollama traduziu: "${text}" -> "${translatedText}"`);
        return translatedText;
      }

      return null;

    } catch (error: any) {
      console.error('❌ Erro na tradução com Ollama:', error);
      
      // Se for erro de conexão, é possível que o Ollama não esteja rodando
      if (error.code === 'ECONNREFUSED' || error.message?.includes('connect')) {
        console.warn('⚠️ Ollama não está acessível. Verifique se está rodando.');
      }
      
      return null;
    }
  }

  /**
   * Converte código de idioma para nome completo
   */
  private getLanguageName(languageCode: string): string {
    const languages: Record<string, string> = {
      'pt': 'Portuguese',
      'en': 'English',
      'es': 'Spanish',
      'fr': 'French',
      'de': 'German',
      'it': 'Italian',
      'ja': 'Japanese',
      'ko': 'Korean',
      'zh': 'Chinese',
      'ru': 'Russian',
      'ar': 'Arabic',
      'hi': 'Hindi',
      'auto': 'Portuguese' // fallback padrão
    };

    return languages[languageCode] || 'Portuguese';
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
    const path = require('path');
    const execAsync = promisify(exec);
    
    // Gerar caminho para o arquivo de áudio com extensão apropriada
    const baseName = path.basename(videoPath, path.extname(videoPath) || '');
    const dirName = path.dirname(videoPath);
    const audioPath = path.join(dirName, `${baseName}_audio.wav`);
    
    try {
      console.log(`🎵 Extraindo áudio: ${videoPath} -> ${audioPath}`);
      
      // Comando FFmpeg com especificações mais robustas
      const command = `ffmpeg -i "${videoPath}" -vn -acodec pcm_s16le -ac 1 -ar 16000 -f wav -y "${audioPath}"`;
      
      const { stdout, stderr } = await execAsync(command);
      
      console.log(`✅ Áudio extraído com sucesso: ${audioPath}`);
      if (stderr) {
        console.log('FFmpeg stderr:', stderr);
      }
      
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

  /**
   * Obter modelos de tradução disponíveis no Ollama
   */
  async getAvailableModels(): Promise<Array<{id: string, name: string, description: string, available: boolean}>> {
    try {
      // Tentar listar modelos disponíveis no Ollama
      const models = await this.ollama.list();
      
      const availableModels = Object.entries(this.supportedModels).map(([id, config]) => {
        const isAvailable = models.models.some(model => model.name.startsWith(id));
        return {
          id,
          name: config.name,
          description: config.description,
          available: isAvailable
        };
      });

      // Adicionar modelos padrão sempre disponíveis
      const defaultModels = [
        {
          id: 'google',
          name: 'Google Translate',
          description: 'Serviço de tradução do Google',
          available: true
        },
        {
          id: 'dictionary',
          name: 'Dictionary Fallback',
          description: 'Sistema de tradução básico usando dicionário local',
          available: true
        }
      ];

      return [...availableModels, ...defaultModels];

    } catch (error) {
      console.warn('⚠️ Erro ao obter modelos Ollama, retornando modelos padrão');
      
      // Retornar apenas modelos não-Ollama se houver erro
      return [
        {
          id: 'google',
          name: 'Google Translate',
          description: 'Serviço de tradução do Google',
          available: true
        },
        {
          id: 'dictionary',
          name: 'Dictionary Fallback',
          description: 'Sistema de tradução básico usando dicionário local',
          available: true
        }
      ];
    }
  }

  /**
   * Obter idiomas suportados para tradução
   */
  getSupportedLanguages(): Array<{code: string, name: string, nativeName: string}> {
    return [
      { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
      { code: 'en', name: 'English', nativeName: 'English' },
      { code: 'es', name: 'Spanish', nativeName: 'Español' },
      { code: 'fr', name: 'French', nativeName: 'Français' },
      { code: 'de', name: 'German', nativeName: 'Deutsch' },
      { code: 'it', name: 'Italian', nativeName: 'Italiano' },
      { code: 'ja', name: 'Japanese', nativeName: '日本語' },
      { code: 'ko', name: 'Korean', nativeName: '한국어' },
      { code: 'zh', name: 'Chinese', nativeName: '中文' },
      { code: 'ru', name: 'Russian', nativeName: 'Русский' },
      { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
      { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' }
    ];
  }

  /**
   * Verificar se o Ollama está disponível
   */
  async isOllamaAvailable(): Promise<boolean> {
    try {
      await this.ollama.list();
      return true;
    } catch (error) {
      return false;
    }
  }
}
