"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const transcription_controller_1 = require("../controllers/transcription.controller");
const router = (0, express_1.Router)();
const transcriptionController = new transcription_controller_1.TranscriptionController();
const upload = (0, multer_1.default)({
    dest: 'temp/',
    limits: {
        fileSize: 100 * 1024 * 1024,
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['video/mp4', 'video/avi', 'video/quicktime', 'video/x-msvideo',
            'audio/mpeg', 'audio/wav', 'audio/flac'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error('Tipo de arquivo não suportado'));
        }
    }
});
const uploadFields = upload.fields([
    { name: 'video', maxCount: 1 },
    { name: 'translatedSegments', maxCount: 1 }
]);
const uploadSingle = upload.single('video');
router.post('/transcribe', uploadSingle, transcriptionController.transcribeAndGenerateVideo.bind(transcriptionController));
router.post('/generate-video-with-translated-subtitles', uploadFields, transcriptionController.generateVideoWithTranslatedSubtitles.bind(transcriptionController));
router.get('/test', (req, res) => {
    res.json({
        message: 'API de transcrição funcionando!',
        timestamp: new Date().toISOString()
    });
});
exports.default = router;
//# sourceMappingURL=transcription.routes.js.map