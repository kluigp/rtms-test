# 🚀 RTMS Quickstart

This simple app demonstrates integration with the [Zoom Realtime Media Streams SDK](https://www.npmjs.com/package/@zoom/rtms) for Node.js.

[![npm](https://img.shields.io/npm/v/@zoom/rtms)](https://www.npmjs.com/package/@zoom/rtms)
[![docs](https://img.shields.io/badge/docs-online-blue)](https://zoom.github.io/rtms/js/)

## 📋 Setup

The SDK is already included in package dependencies. Install other dependencies:

```bash
npm install
```

## ⚙️ Configuration

Copy the example environment file and fill in your credentials:

```bash
cp .env.example .env
```

Set your Zoom OAuth credentials:
```bash
ZM_RTMS_CLIENT=your_client_id
ZM_RTMS_SECRET=your_client_secret
```

## 🏃‍♂️ Running the App

Start the application:

```bash
npm start
```

For webhook testing with ngrok:

```bash
ngrok http 8080
```

Use the generated ngrok URL as your Zoom webhook endpoint. Then, start a meeting to see your data!

## 🎯 Basic Usage

Here's how you can implement the SDK yourself. 

### Import the SDK

**ES Modules:**
```javascript
import rtms from "@zoom/rtms";
```

**CommonJS:**
```javascript
const rtms = require('@zoom/rtms').default;
```

### 🏢 Client-Based Approach

Create a client for each meeting to handle multiple concurrent meetings:

```javascript
// Listen for Zoom webhook events
rtms.onWebhookEvent(({ event, payload }) => {
  if (event === "meeting.rtms_started") {
    const client = new rtms.Client();
    
    // Configure callbacks
    client.onAudioData((buffer, size, timestamp, metadata) => {
      // Process audio data
    });
    
    // Join using webhook payload
    client.join(payload);
  }
});
```

## 📊 Media Parameter Configuration

Configure audio, video, and deskshare processing parameters before joining:

### 🎵 Audio Parameters

```javascript
client.setAudioParams({
  contentType: rtms.AudioContentType.RAW_AUDIO,
  codec: rtms.AudioCodec.OPUS,
  sampleRate: rtms.AudioSampleRate.SR_16K,
  channel: rtms.AudioChannel.STEREO,
  dataOpt: rtms.AudioDataOption.AUDIO_MIXED_STREAM,
  duration: 20,     // 20ms frames
  frameSize: 640    // 16kHz * 2 channels * 20ms
});
```

### 📹 Video Parameters

```javascript
client.setVideoParams({
  contentType: rtms.VideoContentType.RAW_VIDEO,
  codec: rtms.VideoCodec.H264,
  resolution: rtms.VideoResolution.HD,
  dataOpt: rtms.VideoDataOption.VIDEO_SINGLE_ACTIVE_STREAM,
  fps: 30
});
```

### 🖥️ Deskshare Parameters

```javascript
client.setDeskshareParams({
  contentType: rtms.VideoContentType.RAW_VIDEO,
  codec: rtms.VideoCodec.H264,
  resolution: rtms.VideoResolution.FHD,
  dataOpt: rtms.VideoDataOption.VIDEO_SINGLE_ACTIVE_STREAM,
  fps: 15
});
```

## 🔊 Playing the recorded audio

The app writes **raw Opus** (48 kHz, stereo, 20 ms frames). The RTMS SDK does **not** offer Ogg or other container output—only raw Opus.

### Streaming to the browser (no conversion script)

In real-world setups you send the binary straight to the browser. **No server-side conversion is needed**: the browser decodes raw Opus with a WASM decoder and plays via the Web Audio API.

1. **Server**: Keep current settings; stream each `onAudioData` chunk to the client (e.g. over WebSocket or your API).
2. **Browser**: Use **[opus-decoder](https://www.npmjs.com/package/opus-decoder)** (or similar) to decode raw Opus frames to PCM, then play with `AudioContext`:

   ```javascript
   import { OpusDecoder } from 'opus-decoder';

   const decoder = new OpusDecoder();
   await decoder.ready; // WASM loaded

   const ctx = new AudioContext({ sampleRate: 48000 });
   const queue = []; let nextStart = 0;

   function playDecoded(channelData, samplesDecoded, sampleRate) {
     const buffer = ctx.createBuffer(2, samplesDecoded, sampleRate);
     buffer.getChannelData(0).set(channelData[0]);
     buffer.getChannelData(1).set(channelData[1]);
     const source = ctx.createBufferSource();
     source.buffer = buffer;
     source.connect(ctx.destination);
     const start = Math.max(nextStart, ctx.currentTime);
     source.start(start);
     source.stop(start + buffer.duration);
     nextStart = start + buffer.duration;
   }

   // For each raw Opus chunk received (e.g. from WebSocket):
   const { channelData, samplesDecoded, sampleRate } = decoder.decodeFrame(opusChunk);
   if (samplesDecoded > 0) playDecoded(channelData, samplesDecoded, sampleRate);
   ```

   Match the decoder to your stream: **48 kHz, stereo** (same as `index.js`). Run decoder in a Web Worker for best performance.

### Converting to .opus for uploads (optional)

For one-off playback in online players that only accept Ogg Opus, use the conversion script (requires GStreamer):

```bash
./scripts/raw-to-opus.sh logs/audio_<STREAMID>.raw output.opus
```

- **Install GStreamer:** Ubuntu/Debian: `sudo apt install gstreamer1.0-tools gstreamer1.0-plugins-base gstreamer1.0-plugins-good gstreamer1.0-plugins-bad` · macOS: `brew install gstreamer`
- **Play raw locally:** `gst-launch-1.0 filesrc location=logs/audio_<STREAMID>.raw ! opusparse ! opusdec ! autoaudiosink`

## 📞 Available Callbacks

- `onJoinConfirm(reason)` - ✅ Join confirmation
- `onSessionUpdate(op, sessionInfo)` - 🔄 Session state changes  
- `onUserUpdate(op, participantInfo)` - 👥 Participant join/leave
- `onAudioData(buffer, size, timestamp, metadata)` - 🎵 Audio data
- `onVideoData(buffer, size, timestamp, metadata)` - 📹 Video data
- `onTranscriptData(buffer, size, timestamp, metadata)` - 💬 Live transcription
- `onLeave(reason)` - 👋 Meeting ended

## 📚 API Reference

For complete parameter options and detailed documentation:

- 🎵 **[Audio Parameters](https://zoom.github.io/rtms/js/interfaces/AudioParameters.html)** - Complete audio configuration options
- 📹 **[Video Parameters](https://zoom.github.io/rtms/js/interfaces/VideoParameters.html)** - Complete video configuration options  
- 🖥️ **[Deskshare Parameters](https://zoom.github.io/rtms/js/interfaces/VideoParameters.html)** - Complete deskshare configuration options
- 📖 **[Full API Documentation](https://zoom.github.io/rtms/js/)** - Complete SDK reference