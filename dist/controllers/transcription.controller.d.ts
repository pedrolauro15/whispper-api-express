import { Request, Response } from 'express';
export interface TranslatedSegment {
    start: number;
    end: number;
    text: string;
}
export declare class TranscriptionController {
    private videoService;
    constructor();
    transcribeAndGenerateVideo(req: Request, res: Response): Promise<void>;
    generateVideoWithTranslatedSubtitles(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=transcription.controller.d.ts.map