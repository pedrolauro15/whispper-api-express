import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface SubtitleStyle {
  fontName: string;
  fontSize: number;
  fontColor: string;
  backgroundColor: string;
  borderWidth: number;
  borderColor: string;
  marginVertical: number;
}

export interface TranslatedSegment {
  start: number;
  end: number;
  text: string;
}

export interface VideoResult {
  success: boolean;
  message: string;
  outputPath?: string;
}

export class VideoService {

  async generateVideoWithSubtitles(
    inputVideoPath: string,
    segments: TranslatedSegment[],
    style: SubtitleStyle
  ): Promise<VideoResult> {
    try {
      console.log('🎬 Iniciando geração de vídeo com legendas...');

      // Verificar se FFmpeg está disponível
      try {
        await execAsync('ffmpeg -version');
        console.log('✅ FFmpeg disponível');
      } catch (ffmpegError) {
        return {
          success: false,
          message: 'FFmpeg não encontrado. Instale o FFmpeg para continuar.'
        };
      }

      // Gerar arquivo SRT
      const srtPath = await this.generateSRTFile(segments);
      console.log(`📝 Arquivo SRT gerado: ${srtPath}`);

      // Gerar vídeo com legendas
      const outputPath = this.generateOutputPath(inputVideoPath);
      
      const ffmpegCommand = this.buildFFmpegCommand(inputVideoPath, srtPath, outputPath, style);
      
      console.log(`🔄 Executando FFmpeg: ${ffmpegCommand}`);
      
      const { stdout, stderr } = await execAsync(ffmpegCommand);
      
      console.log('✅ FFmpeg executado com sucesso');
      if (stderr) {
        console.log('FFmpeg stderr:', stderr);
      }

      // Verificar se o arquivo foi criado
      if (!fs.existsSync(outputPath)) {
        // Limpar arquivo SRT
        fs.unlinkSync(srtPath);
        return {
          success: false,
          message: 'Arquivo de saída não foi criado'
        };
      }

      const stats = fs.statSync(outputPath);
      console.log(`✅ Vídeo criado: ${outputPath} (${stats.size} bytes)`);

      // Limpar arquivo SRT temporário
      fs.unlinkSync(srtPath);

      return {
        success: true,
        message: 'Vídeo com legendas gerado com sucesso',
        outputPath
      };

    } catch (error: any) {
      console.error('❌ Erro na geração de vídeo:', error);
      return {
        success: false,
        message: `Erro na geração: ${error.message}`
      };
    }
  }

  private async generateSRTFile(segments: TranslatedSegment[]): Promise<string> {
    const srtContent = segments.map((segment, index) => {
      const startTime = this.formatSRTTime(segment.start);
      const endTime = this.formatSRTTime(segment.end);
      
      return [
        index + 1,
        `${startTime} --> ${endTime}`,
        segment.text,
        ''
      ].join('\n');
    }).join('\n');

    const srtPath = path.join('temp', `subtitles_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.srt`);
    
    // Garantir que o diretório temp existe
    const tempDir = path.dirname(srtPath);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    fs.writeFileSync(srtPath, srtContent, 'utf8');
    return srtPath;
  }

  private formatSRTTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const milliseconds = Math.floor((seconds % 1) * 1000);

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`;
  }

  private generateOutputPath(inputPath: string): string {
    const ext = path.extname(inputPath);
    const basename = path.basename(inputPath, ext);
    const dirname = path.dirname(inputPath);
    
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substr(2, 8);
    
    return path.join(dirname, `${basename}_subtitled_${timestamp}_${randomId}.mp4`);
  }

  private buildFFmpegCommand(inputPath: string, srtPath: string, outputPath: string, style: SubtitleStyle): string {
    // Escapar caminhos para shell
    const escapedInputPath = `"${inputPath}"`;
    const escapedSrtPath = `"${srtPath}"`;
    const escapedOutputPath = `"${outputPath}"`;

    // Converter cores hex para BGR (FFmpeg format)
    const fontColorBGR = this.hexToBGR(style.fontColor);
    const backgroundColorBGR = this.hexToBGR(style.backgroundColor);
    const borderColorBGR = this.hexToBGR(style.borderColor);

    const subtitleFilter = `subtitles=${escapedSrtPath}:force_style='FontName=${style.fontName},FontSize=${style.fontSize},PrimaryColour=${fontColorBGR},BackColour=${backgroundColorBGR},BorderWidth=${style.borderWidth},OutlineColour=${borderColorBGR},MarginV=${style.marginVertical}'`;

    return [
      'ffmpeg',
      '-i', escapedInputPath,
      '-vf', `"${subtitleFilter}"`,
      '-c:a', 'copy',
      '-c:v', 'libx264',
      '-preset', 'medium',
      '-crf', '23',
      '-y',
      escapedOutputPath
    ].join(' ');
  }

  private hexToBGR(hex: string): string {
    // Remove # se presente
    hex = hex.replace('#', '');
    
    // Converte para RGB
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // Converte para formato BGR do FFmpeg (&HBBGGRR&)
    return `&H${b.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${r.toString(16).padStart(2, '0')}&`;
  }
}
