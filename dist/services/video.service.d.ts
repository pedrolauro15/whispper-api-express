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
export declare class VideoService {
    generateVideoWithSubtitles(inputVideoPath: string, segments: TranslatedSegment[], style: SubtitleStyle): Promise<VideoResult>;
    private generateSRTFile;
    private formatSRTTime;
    private generateOutputPath;
    private buildFFmpegCommand;
    private hexToBGR;
}
//# sourceMappingURL=video.service.d.ts.map