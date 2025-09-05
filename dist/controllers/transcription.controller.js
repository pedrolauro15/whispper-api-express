"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TranscriptionController = void 0;
const fs_1 = __importDefault(require("fs"));
const video_service_1 = require("../services/video.service");
class TranscriptionController {
    constructor() {
        this.videoService = new video_service_1.VideoService();
    }
    async transcribeAndGenerateVideo(req, res) {
        try {
            console.log('🎙️ Iniciando transcrição e geração de vídeo');
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
            const mockTranscription = [
                { start: 0, end: 3, text: `Texto transcrito em ${targetLanguage === 'pt' ? 'português' : 'idioma selecionado'}` },
                { start: 3, end: 6, text: `Segunda parte da transcrição em ${targetLanguage}` },
                { start: 6, end: 9, text: `Terceira parte do áudio transcrito` }
            ];
            console.log(`📝 Mock: ${mockTranscription.length} segmentos criados`);
            const result = await this.videoService.generateVideoWithSubtitles(videoFile.path, mockTranscription, {
                fontName: 'Arial',
                fontSize: 20,
                fontColor: '#ffffff',
                backgroundColor: '#000000cc',
                borderWidth: 1,
                borderColor: '#000000',
                marginVertical: 50
            });
            if (!result.success) {
                fs_1.default.unlinkSync(videoFile.path);
                res.status(500).json({
                    error: 'Falha ao gerar vídeo com legendas',
                    detail: result.message
                });
                return;
            }
            console.log('✅ Vídeo processado com sucesso!');
            res.json({
                success: true,
                originalFile: videoFile.originalname,
                targetLanguage: targetLanguage,
                duration: '9s',
                segmentsCount: mockTranscription.length,
                transcription: mockTranscription,
                outputPath: `/download/${videoFile.originalname.replace(/\.[^/.]+$/, '_with_subtitles.mp4')}`,
                message: 'Vídeo processado com sucesso!'
            });
            setTimeout(() => {
                if (fs_1.default.existsSync(videoFile.path)) {
                    fs_1.default.unlinkSync(videoFile.path);
                }
            }, 5000);
        }
        catch (error) {
            console.error('❌ Erro na transcrição:', error);
            if (req.file && fs_1.default.existsSync(req.file.path)) {
                fs_1.default.unlinkSync(req.file.path);
            }
            res.status(500).json({
                error: 'Erro interno do servidor',
                detail: error.message
            });
        }
    }
    async generateVideoWithTranslatedSubtitles(req, res) {
        try {
            console.log('🎬 Iniciando geração de vídeo com legendas traduzidas');
            const files = req.files;
            const videoFile = files?.video?.[0];
            if (!videoFile) {
                res.status(400).json({
                    error: 'Nenhum arquivo de vídeo enviado',
                    detail: 'Campo "video" é obrigatório'
                });
                return;
            }
            console.log(`✅ Arquivo recebido: ${videoFile.originalname} (${videoFile.mimetype})`);
            let translatedSegments = [];
            if (req.body.translatedSegments) {
                try {
                    translatedSegments = typeof req.body.translatedSegments === 'string'
                        ? JSON.parse(req.body.translatedSegments)
                        : req.body.translatedSegments;
                    console.log(`📝 Segmentos recebidos via body: ${translatedSegments.length} itens`);
                }
                catch (parseError) {
                    console.error('❌ Erro ao fazer parse dos segmentos:', parseError);
                    res.status(400).json({
                        error: 'Erro ao processar segmentos traduzidos',
                        detail: 'Os segmentos devem estar em formato JSON válido'
                    });
                    return;
                }
            }
            if (!translatedSegments || translatedSegments.length === 0) {
                console.warn('⚠️ Nenhum segmento recebido, usando dados mock para teste');
                translatedSegments = [
                    { start: 0, end: 3, text: "Este é um teste de legenda traduzida via Express" },
                    { start: 3, end: 6, text: "Segunda parte do teste com Express e Multer" },
                    { start: 6, end: 9, text: "Terceira e última parte do teste mock" }
                ];
            }
            console.log(`🎯 Processando ${translatedSegments.length} segmentos traduzidos`);
            const result = await this.videoService.generateVideoWithSubtitles(videoFile.path, translatedSegments, {
                fontName: 'Arial',
                fontSize: 18,
                fontColor: '#ffffff',
                backgroundColor: '#000000',
                borderWidth: 1,
                borderColor: '#000000',
                marginVertical: 20
            });
            if (!result.success) {
                fs_1.default.unlinkSync(videoFile.path);
                res.status(500).json({
                    error: 'Falha ao gerar vídeo com legendas',
                    detail: result.message
                });
                return;
            }
            console.log('✅ Vídeo com legendas gerado com sucesso!');
            const fileName = videoFile.originalname.replace(/\.[^/.]+$/, '_with_subtitles.mp4');
            res.setHeader('Content-Type', 'video/mp4');
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
            res.sendFile(result.outputPath, (err) => {
                fs_1.default.unlinkSync(videoFile.path);
                if (result.outputPath && fs_1.default.existsSync(result.outputPath)) {
                    fs_1.default.unlinkSync(result.outputPath);
                }
                if (err) {
                    console.error('❌ Erro ao enviar arquivo:', err);
                }
            });
        }
        catch (error) {
            console.error('❌ Erro na geração de vídeo:', error);
            const files = req.files;
            const videoFile = files?.video?.[0];
            if (videoFile && fs_1.default.existsSync(videoFile.path)) {
                fs_1.default.unlinkSync(videoFile.path);
            }
            res.status(500).json({
                error: 'Erro interno do servidor',
                detail: error.message
            });
        }
    }
}
exports.TranscriptionController = TranscriptionController;
//# sourceMappingURL=transcription.controller.js.map