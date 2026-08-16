import type { MockEvaluation, InterviewReportResult } from "@/types/session";

export type TranscriptSource = "candidate" | "interviewer";

export interface RealtimeCallbacks {
  onTranscript: (source: TranscriptSource, text: string, isFinal: boolean, sequence?: number) => void;
  onClassification: (sequence: number, category: string, intent: string) => void;
  onAnswerStart: (sequence: number) => void;
  onToken: (text: string) => void;
  onAnswerEnd: (sequence: number, id: string | null, cancelled: boolean) => void;
  onError: (detail: string) => void;
  onClose: () => void;
}

export interface MockInterviewCallbacks {
  onQuestion: (sequence: number, text: string) => void;
  onTranscript: (text: string, isFinal: boolean) => void;
  onEvaluation: (evaluation: MockEvaluation) => void;
  onNudge: (text: string) => void;
  onInterviewEnd: (report: InterviewReportResult) => void;
  onError: (detail: string) => void;
  onClose: () => void;
}

const SOURCE_BYTE: Record<TranscriptSource, number> = {
  candidate: 0,
  interviewer: 1,
};

const TARGET_SAMPLE_RATE = 16000;

function toWsBase(apiUrl: string): string {
  if (apiUrl.startsWith("/")) {
    // Relative URL — build absolute WS URL from current window origin
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return origin.replace(/^http/, "ws") + apiUrl;
  }
  return apiUrl.replace(/^http/, "ws");
}

export function getInterviewWsUrl(
  apiUrl: string,
  sessionId: string,
  token: string,
): string {
  const wsBase = toWsBase(apiUrl);
  const params = new URLSearchParams({ token, session_id: sessionId });
  return `${wsBase}/ws/interview?${params.toString()}`;
}

export function getMockInterviewWsUrl(
  apiUrl: string,
  sessionId: string,
  token: string,
  durationMinutes: number = 20,
): string {
  const wsBase = toWsBase(apiUrl);
  const params = new URLSearchParams({
    token,
    session_id: sessionId,
    duration_minutes: String(durationMinutes),
  });
  return `${wsBase}/ws/mock-interview?${params.toString()}`;
}

function downsample(input: Float32Array, inputRate: number, outputRate: number): Float32Array {
  if (outputRate === inputRate) return input;
  const ratio = inputRate / outputRate;
  const newLength = Math.round(input.length / ratio);
  const result = new Float32Array(newLength);
  let offsetResult = 0;
  let offsetInput = 0;
  while (offsetResult < newLength) {
    const nextOffsetInput = Math.round((offsetResult + 1) * ratio);
    let accum = 0;
    let count = 0;
    for (let i = offsetInput; i < nextOffsetInput && i < input.length; i++) {
      accum += input[i];
      count++;
    }
    result[offsetResult] = count > 0 ? accum / count : 0;
    offsetResult++;
    offsetInput = nextOffsetInput;
  }
  return result;
}

function floatTo16BitPCM(input: Float32Array): Int16Array {
  const output = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return output;
}

/** Captures one MediaStream, downsamples to 16kHz mono PCM16, and emits chunks. */
class PCMCapture {
  private ctx: AudioContext;
  private source: MediaStreamAudioSourceNode;
  private processor: ScriptProcessorNode;
  private silentGain: GainNode;

  constructor(stream: MediaStream, onChunk: (pcm: Int16Array) => void) {
    this.ctx = new AudioContext();
    this.source = this.ctx.createMediaStreamSource(stream);
    this.processor = this.ctx.createScriptProcessor(4096, 1, 1);
    this.silentGain = this.ctx.createGain();
    this.silentGain.gain.value = 0;

    this.processor.onaudioprocess = (event) => {
      const input = event.inputBuffer.getChannelData(0);
      const resampled = downsample(input, this.ctx.sampleRate, TARGET_SAMPLE_RATE);
      onChunk(floatTo16BitPCM(resampled));
    };

    // Routing through a silent gain node (instead of leaving the processor
    // unconnected) keeps it alive across browsers without producing audible
    // echo/feedback from either the mic or the captured tab audio.
    this.source.connect(this.processor);
    this.processor.connect(this.silentGain);
    this.silentGain.connect(this.ctx.destination);
  }

  stop(): void {
    this.processor.onaudioprocess = null;
    this.source.disconnect();
    this.processor.disconnect();
    this.silentGain.disconnect();
    // ctx.close() is async but nodes are already disconnected — fire-and-forget
    // so the browser can reclaim the AudioContext slot immediately.
    this.ctx.close().catch(() => undefined);
  }
}

export class LiveInterviewClient {
  private ws: WebSocket | null = null;
  private candidateStream: MediaStream | null = null;
  private interviewerStream: MediaStream | null = null;
  private candidateCapture: PCMCapture | null = null;
  private interviewerCapture: PCMCapture | null = null;

  constructor(private callbacks: RealtimeCallbacks) {}

  /** Requests mic + tab/system audio, connects the socket, and starts streaming. */
  async start(wsUrl: string): Promise<{ interviewerAudioAvailable: boolean }> {
    this.candidateStream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1 },
    });

    let interviewerAudioAvailable = false;
    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });
      displayStream.getVideoTracks().forEach((track) => track.stop());
      const audioTracks = displayStream.getAudioTracks();
      if (audioTracks.length > 0) {
        this.interviewerStream = new MediaStream(audioTracks);
        interviewerAudioAvailable = true;
      }
    } catch {
      // User declined the share picker, or the browser doesn't support
      // audio-capable display capture. Falls back to solo practice mode —
      // see the candidate capture wiring below.
      interviewerAudioAvailable = false;
    }

    await this.connect(wsUrl);

    this.candidateCapture = new PCMCapture(this.candidateStream, (pcm) => {
      this.send("candidate", pcm);
    });
    if (this.interviewerStream) {
      this.interviewerCapture = new PCMCapture(this.interviewerStream, (pcm) =>
        this.send("interviewer", pcm),
      );
    }

    return { interviewerAudioAvailable };
  }

  private connect(wsUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(wsUrl);
      ws.binaryType = "arraybuffer";
      ws.onopen = () => resolve();
      ws.onerror = () => reject(new Error("Failed to connect to the live interview server."));
      ws.onclose = () => this.callbacks.onClose();
      ws.onmessage = (event) => this.handleMessage(event);
      this.ws = ws;
    });
  }

  private handleMessage(event: MessageEvent<string>): void {
    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(event.data);
    } catch {
      return;
    }
    switch (msg.type) {
      case "transcript":
        this.callbacks.onTranscript(
          msg.source as TranscriptSource,
          (msg.text as string) ?? "",
          Boolean(msg.is_final),
          msg.sequence as number | undefined
        );
        break;
      case "classification":
        this.callbacks.onClassification(
          (msg.sequence as number) ?? 0,
          (msg.category as string) ?? "",
          (msg.intent as string) ?? "",
        );
        break;
      case "answer_start":
        this.callbacks.onAnswerStart((msg.sequence as number) ?? 0);
        break;
      case "token":
        this.callbacks.onToken((msg.text as string) ?? "");
        break;
      case "answer_end":
        this.callbacks.onAnswerEnd(
          (msg.sequence as number) ?? 0,
          (msg.id as string | null) ?? null,
          Boolean(msg.cancelled)
        );
        break;
      case "error":
        this.callbacks.onError((msg.detail as string) ?? "Unknown error");
        break;
    }
  }

  private send(source: TranscriptSource, pcm: Int16Array): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const frame = new Uint8Array(1 + pcm.byteLength);
    frame[0] = SOURCE_BYTE[source];
    frame.set(new Uint8Array(pcm.buffer), 1);
    this.ws.send(frame.buffer);
  }

  /** Stops audio capture only — WebSocket stays open so in-flight responses can finish. */
  stopAudio(): void {
    this.candidateCapture?.stop();
    this.interviewerCapture?.stop();
    this.candidateCapture = null;
    this.interviewerCapture = null;

    this.candidateStream?.getTracks().forEach((track) => track.stop());
    this.interviewerStream?.getTracks().forEach((track) => track.stop());
    this.candidateStream = null;
    this.interviewerStream = null;
  }

  stop(): void {
    this.stopAudio();

    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
  }
}

/**
 * Client for the voice mock-interview WebSocket (`/ws/mock-interview`).
 *
 * Protocol differences vs LiveInterviewClient:
 * - Only candidate audio is captured (no display/tab capture needed).
 * - Audio frames are sent as raw PCM16 with NO source-byte prefix.
 * - Server sends: `transcript`, `question`, `evaluation`, `interview_end`, `error`.
 */
export class MockInterviewClient {
  private ws: WebSocket | null = null;
  private micStream: MediaStream | null = null;
  private micCapture: PCMCapture | null = null;

  constructor(private callbacks: MockInterviewCallbacks) {}

  /** Requests mic access, connects the WS, and starts streaming candidate audio. */
  async start(wsUrl: string): Promise<void> {
    this.micStream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1 },
    });

    await this.connect(wsUrl);

    this.micCapture = new PCMCapture(this.micStream, (pcm) => {
      this.sendAudio(pcm);
    });
  }

  private connect(wsUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(wsUrl);
      ws.binaryType = "arraybuffer";
      ws.onopen = () => resolve();
      ws.onerror = () => reject(new Error("Failed to connect to the mock interview server."));
      ws.onclose = () => this.callbacks.onClose();
      ws.onmessage = (event) => this.handleMessage(event);
      this.ws = ws;
    });
  }

  private handleMessage(event: MessageEvent<string>): void {
    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(event.data);
    } catch {
      return;
    }
    switch (msg.type) {
      case "transcript":
        this.callbacks.onTranscript(
          (msg.text as string) ?? "",
          Boolean(msg.is_final),
        );
        break;
      case "question":
        this.callbacks.onQuestion(
          (msg.sequence as number) ?? 0,
          (msg.text as string) ?? "",
        );
        break;
      case "evaluation":
        if (msg.case === true) {
          this.callbacks.onEvaluation({
            score: (msg.score as number) ?? 0,
            feedback: (msg.feedback as string) ?? "",
            suggestions: [],
            is_case: true,
            thread_id: (msg.thread_id as string | null) ?? null,
            structure: (msg.structure as string) ?? "",
            handling_complications: (msg.handling_complications as string) ?? "",
            conclusion: (msg.conclusion as string) ?? "",
          });
        } else {
          this.callbacks.onEvaluation({
            score: (msg.score as number) ?? 0,
            feedback: (msg.feedback as string) ?? "",
            suggestions: (msg.suggestions as string[]) ?? [],
            is_case: false,
          });
        }
        break;
      case "nudge":
        this.callbacks.onNudge((msg.text as string) ?? "");
        break;
      case "interview_end":
        this.callbacks.onInterviewEnd(
          (msg.report as InterviewReportResult) ?? {} as InterviewReportResult,
        );
        break;
      case "error":
        this.callbacks.onError((msg.detail as string) ?? "Unknown error");
        break;
    }
  }

  /** Send raw PCM16 — no source-byte prefix for mock interview. */
  private sendAudio(pcm: Int16Array): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(pcm.buffer);
  }

  stop(): void {
    this.micCapture?.stop();
    this.micCapture = null;
    this.micStream?.getTracks().forEach((track) => track.stop());
    this.micStream = null;

    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
  }
}
