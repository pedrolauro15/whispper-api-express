"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VideoService = void 0;
const child_process_1 = require("child_process");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const util_1 = require("util");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class VideoService {
    async generateVideoWithSubtitles(inputVideoPath, segments, style) {
        try {
            console.log('🎬 Iniciando geração de vídeo com legendas...');
            try {
                await execAsync('ffmpeg -version');
                console.log('✅ FFmpeg disponível');
            }
            catch (ffmpegError) {
                return {
                    success: false,
                    message: 'FFmpeg não encontrado. Instale o FFmpeg para continuar.'
                };
            }
            const srtPath = await this.generateSRTFile(segments);
            console.log(`📝 Arquivo SRT gerado: ${srtPath}`);
            const outputPath = this.generateOutputPath(inputVideoPath);
            const ffmpegCommand = this.buildFFmpegCommand(inputVideoPath, srtPath, outputPath, style);
            console.log(`🔄 Executando FFmpeg: ${ffmpegCommand}`);
            const { stdout, stderr } = await execAsync(ffmpegCommand);
            console.log('✅ FFmpeg executado com sucesso');
            if (stderr) {
                console.log('FFmpeg stderr:', stderr);
            }
            if (!fs_1.default.existsSync(outputPath)) {
                fs_1.default.unlinkSync(srtPath);
                return {
                    success: false,
                    message: 'Arquivo de saída não foi criado'
                };
            }
            const stats = fs_1.default.statSync(outputPath);
            console.log(`✅ Vídeo criado: ${outputPath} (${stats.size} bytes)`);
            fs_1.default.unlinkSync(srtPath);
            return {
                success: true,
                message: 'Vídeo com legendas gerado com sucesso',
                outputPath
            };
        }
        catch (error) {
            console.error('❌ Erro na geração de vídeo:', error);
            return {
                success: false,
                message: `Erro na geração: ${error.message}`
            };
        }
    }
    async generateSRTFile(segments) {
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
        const srtPath = path_1.default.join('temp', `subtitles_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.srt`);
        const tempDir = path_1.default.dirname(srtPath);
        if (!fs_1.default.existsSync(tempDir)) {
            fs_1.default.mkdirSync(tempDir, { recursive: true });
        }
        fs_1.default.writeFileSync(srtPath, srtContent, 'utf8');
        return srtPath;
    }
    formatSRTTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        const milliseconds = Math.floor((seconds % 1) * 1000);
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`;
    }
    generateOutputPath(inputPath) {
        const ext = path_1.default.extname(inputPath);
        const basename = path_1.default.basename(inputPath, ext);
        const dirname = path_1.default.dirname(inputPath);
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substr(2, 8);
        return path_1.default.join(dirname, `${basename}_subtitled_${timestamp}_${randomId}.mp4`);
    }
    buildFFmpegCommand(inputPath, srtPath, outputPath, style) {
        const escapedInputPath = `"${inputPath}"`;
        const escapedSrtPath = `"${srtPath}"`;
        const escapedOutputPath = `"${outputPath}"`;
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
    hexToBGR(hex) {
        hex = hex.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        return `&H${b.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${r.toString(16).padStart(2, '0')}&`;
    }
}
exports.VideoService = VideoService;
//# sourceMappingURL=video.service.js.map