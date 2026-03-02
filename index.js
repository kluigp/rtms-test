import rtms from "@zoom/rtms";
import fs from "fs";

const basePath = "/usr/src/app/logs";

if (!fs.existsSync(basePath)) {
  fs.mkdirSync(basePath, { recursive: true });
}

const logFile = fs.createWriteStream(`${basePath}/rtms_events.log`, { flags: "a" });

function log(message) {
  const line = `${new Date().toISOString()} | ${message}`;
  console.log(line);
  logFile.write(line + "\n");
}

let sessions = new Map();

rtms.onWebhookEvent(({ event, payload }) => {
  const streamId = payload?.rtms_stream_id;
  if (!streamId) return;

  log(`Received event: ${event} for stream ${streamId}`);

  // =============================
  // RTMS STARTED
  // =============================
  if (event === "meeting.rtms_started") {
    if (sessions.has(streamId)) {
      log(`Session already exists for ${streamId}`);
      return;
    }

    const client = new rtms.Client();

    const audioStream = fs.createWriteStream(`${basePath}/audio_${streamId}.raw`);
    const videoStream = fs.createWriteStream(`${basePath}/video_${streamId}.h264`);
    const deskshareStream = fs.createWriteStream(`${basePath}/deskshare_${streamId}.h264`);

    sessions.set(streamId, {
      client,
      audioStream,
      videoStream,
      deskshareStream,
    });

    const audioParams = {
      contentType: rtms.AudioContentType.RAW_AUDIO,
      codec: rtms.AudioCodec.L16,
      sampleRate: rtms.AudioSampleRate.SR_16K,
      channel: rtms.AudioChannel.MONO,
      dataOpt: rtms.AudioDataOption.AUDIO_MIXED_STREAM,
      duration: 20,
      frameSize: 320, // 16000 * 0.02
    };

    const videoParams = {
      contentType: rtms.VideoContentType.RAW_VIDEO,
      codec: rtms.VideoCodec.H264,
      resolution: rtms.VideoResolution.HD,
      dataOpt: rtms.VideoDataOption.VIDEO_SINGLE_ACTIVE_STREAM,
      fps: 30,
    };

    client.setAudioParams(audioParams);
    client.setVideoParams(videoParams);
    client.setDeskshareParams(videoParams);

    let carry = null; // holds 1 leftover byte between chunks (PCM16 alignment)

    client.onAudioData((data, size) => {
      let chunk = Buffer.isBuffer(data)
        ? data
        : Buffer.from(data.buffer, data.byteOffset, data.byteLength);

      // ✅ Trust RTMS 'size' (bytes) if provided
      if (typeof size === "number") {
        if (size <= 0) return;
        if (size > chunk.length) {
          // clamp; don't read past buffer
          size = chunk.length;
        }
        chunk = chunk.subarray(0, size);
      }

      // ✅ Drop/accumulate odd byte so PCM16 stays aligned
      if (carry) {
        chunk = Buffer.concat([carry, chunk]);
        carry = null;
      }
      if (chunk.length === 1) {
        carry = chunk; // wait for next chunk
        return;
      }
      if (chunk.length % 2 === 1) {
        carry = chunk.subarray(chunk.length - 1);
        chunk = chunk.subarray(0, chunk.length - 1);
      }

      audioStream.write(chunk);
    });

    client.onVideoData((data) => {
      videoStream.write(data);
    });

    client.onDeskshareData((data) => {
      deskshareStream.write(data);
    });

    client.onTranscriptData((data, size, timestamp, metadata) => {
      log(`[${timestamp}] ${metadata.userName}: ${data}`);
    });

    client.join(payload);

    log(`RTMS client started for ${streamId}`);
    return;
  }

  // =============================
  // RTMS STOPPED
  // =============================
  if (event === "meeting.rtms_stopped") {
    const session = sessions.get(streamId);
    if (!session) {
      log(`No active session found for ${streamId}`);
      return;
    }

    session.audioStream.end();
    session.videoStream.end();
    session.deskshareStream.end();

    session.client.leave();

    sessions.delete(streamId);

    log(`RTMS client stopped and files closed for ${streamId}`);
    return;
  }

  log(`Ignoring event: ${event}`);
});