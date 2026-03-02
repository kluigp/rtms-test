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

The app writes **raw Opus** to `audio_<streamId>.raw` (e.g. `audio_abc123.raw`). Use the **actual filename** from your `logs/` folder—replace `<streamId>` with the real ID from `rtms_events.log` or the file list.

**Format (for reference):** Opus, 48 kHz, stereo, 20 ms frames.

Most online players do not accept raw binary Opus; they expect **Ogg Opus** (`.opus`). **FFmpeg cannot read raw Opus** (no demuxer), so conversion uses **GStreamer**.

- **Convert to .opus for online players (requires GStreamer):**
  ```bash
  ./scripts/raw-to-opus.sh logs/audio_<STREAMID>.raw output.opus
  ```
  Example: `./scripts/raw-to-opus.sh logs/audio_abc123.raw meeting.opus`  
  Then upload `output.opus` (or `meeting.opus`) to any online audio player.

- **Install GStreamer if needed:**
  - Ubuntu/Debian: `sudo apt install gstreamer1.0-tools gstreamer1.0-plugins-base gstreamer1.0-plugins-good gstreamer1.0-plugins-bad`
  - macOS: `brew install gstreamer`

- **Play raw file locally (if your player supports it):**
  ```bash
  gst-launch-1.0 filesrc location=logs/audio_<STREAMID>.raw ! opusparse ! opusdec ! autoaudiosink
  ```

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