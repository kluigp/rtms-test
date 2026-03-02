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

    // Raw Opus format (for ffmpeg/ffplay and conversion to .opus for online players):
    //   Codec: Opus
    //   Sample rate: 48000 Hz
    //   Channels: 2 (stereo)
    //   Frame duration: 20 ms (960 samples/ch @ 48k)
    // Play locally: ffplay -f opus -ar 48000 -ac 2 audio_<streamId>.raw
    // Convert to .opus (for online players): ffmpeg -f opus -ar 48000 -ac 2 -i audio_<streamId>.raw -c copy out.opus
    const audioParams = {
      contentType: rtms.AudioContentType.RAW_AUDIO,
      codec: rtms.AudioCodec.OPUS,
      sampleRate: rtms.AudioSampleRate.SR_48K,
      channel: rtms.AudioChannel.STEREO,
      dataOpt: rtms.AudioDataOption.AUDIO_MIXED_STREAM,
      duration: 20,
      frameSize: 960,
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

    client.onAudioData((data, size) => {
      // Always normalize to Buffer before writing
      const chunk = Buffer.isBuffer(data)
        ? data
        : Buffer.from(data.buffer, data.byteOffset, data.byteLength);

      //Optinal sanity check
      if (size && chunk.length !== size) {
        log(`Audio size mismatch: chunk=${chunk.length}, size=${size}`);
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