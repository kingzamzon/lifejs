import { OpenAI } from "openai";
import { z } from "zod";
import { TTSBase, type TTSGenerateJob } from "../base";

// Config
export const openaiTTSConfigSchema = z.object({
  apiKey: z.string().default(process.env.OPENAI_API_KEY ?? ""),
  model: z.enum([
    "tts-1",
    "tts-1-hd",
    "gpt-4o-mini-tts",
  ]).default("tts-1"),
  voice: z.enum([
    "alloy",
    "ash",
    "ballad",
    "coral",
    "echo",
    "fable",
    "onyx",
    "nova",
    "sage",
    "shimmer",
    "verse",
  ]).default("alloy"),
  response_format: z.enum([
    "mp3",
    "opus",
    "aac",
    "flac",
    "wav",
    "pcm",
  ]).default("mp3"),
  speed: z.number().min(0.25).max(4).default(1).optional(),
});

// Model
export class OpenAiTTS extends TTSBase<typeof openaiTTSConfigSchema> {
  #openai: OpenAI;

  constructor(config: z.input<typeof openaiTTSConfigSchema>) {
    super(openaiTTSConfigSchema, config);
    if (!config.apiKey)
      throw new Error(
        "OPENAI_API_KEY environment variable or config.apiKey must be provided to use this model.",
      );
    this.#openai = new OpenAI({ apiKey: config.apiKey });
  }

  async generate(): Promise<TTSGenerateJob> {
    // Create a new generation job
    const job = this.createGenerateJob();

    return job;
  }

  protected async _onGeneratePushText(job: TTSGenerateJob, text: string): Promise<void> {
    const { model, voice, response_format, speed } = this.config;
    const response = await this.#openai.audio.speech.create({
        model,
        input: text,
        voice,
        response_format,
        speed,
    });

    for await (const chunk of response as any) {
      if (job.raw.abortController.signal.aborted) break;
      // chunk.data is a Buffer (Node.js) or Uint8Array (browser)
      job.raw.receiveChunk({ type: "content", voiceChunk: chunk.data });
    }
    job.raw.receiveChunk({ type: "end" });

  }
}
