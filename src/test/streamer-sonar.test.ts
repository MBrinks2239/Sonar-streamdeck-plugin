import SonarStreamer from "../managers/streamer-sonar";
import Channel from "../types/channels";
import { StreamRedirectionId } from "../types/stream-redirection";

describe("SonarStreamer", () => {
  let sonar: SonarStreamer;

  beforeAll(async () => {
    sonar = new SonarStreamer();
    await sonar.waitForInitialization();
  });

  test("mode is stream", async () => {
    const inStreamerMode = await sonar.isStreamerMode();
    expect(inStreamerMode).toBe(true);
  });

  test("getVolumes returns both sliders and all channels", async () => {
    const volumes = await sonar.getVolumes();

    for (const slider of Object.values(StreamRedirectionId)) {
      expect(volumes).toHaveProperty(slider);
      for (const channel of Object.values(Channel)) {
        expect(volumes[slider]).toHaveProperty(channel);
        expect(typeof volumes[slider][channel].volume).toBe("number");
        expect(typeof volumes[slider][channel].muted).toBe("boolean");
      }
    }
  });

  test("getVolume returns a ChannelVolume for the streaming master slider", async () => {
    const volume = await sonar.getVolume(
      StreamRedirectionId.Streaming,
      Channel.Master,
    );
    expect(volume).toHaveProperty("volume");
    expect(volume).toHaveProperty("muted");
  });

  test("setVolume changes the game streaming volume", async () => {
    const original = await sonar.getVolume(StreamRedirectionId.Streaming, Channel.Game);

    const target = original.volume > 0.5 ? 0.3 : 0.7;
    const ok = await sonar.setVolume(
      StreamRedirectionId.Streaming,
      Channel.Game,
      target,
    );
    expect(ok).toBe(true);

    const updated = await sonar.getVolume(StreamRedirectionId.Streaming, Channel.Game);
    expect(Math.round(updated.volume * 100)).toBe(Math.round(target * 100));

    // restore
    await sonar.setVolume(StreamRedirectionId.Streaming, Channel.Game, original.volume);
  });

  test("setVolume changes the master streaming volume", async () => {
    const original = await sonar.getVolume(StreamRedirectionId.Streaming, Channel.Master);

    const target = original.volume > 0.5 ? 0.3 : 0.7;
    const ok = await sonar.setVolume(
      StreamRedirectionId.Streaming,
      Channel.Master,
      target,
    );
    expect(ok).toBe(true);

    const updated = await sonar.getVolume(StreamRedirectionId.Streaming, Channel.Master);
    expect(Math.round(updated.volume * 100)).toBe(Math.round(target * 100));

    await sonar.setVolume(StreamRedirectionId.Streaming, Channel.Master, original.volume);
  });

  test("muteChannel toggles game streaming mute", async () => {
    const original = await sonar.getVolume(StreamRedirectionId.Streaming, Channel.Game);

    const ok = await sonar.muteChannel(
      StreamRedirectionId.Streaming,
      Channel.Game,
      !original.muted,
    );
    expect(ok).toBe(true);

    const updated = await sonar.getVolume(StreamRedirectionId.Streaming, Channel.Game);
    expect(updated.muted).toBe(!original.muted);

    await sonar.muteChannel(StreamRedirectionId.Streaming, Channel.Game, original.muted);
  });

  test("offsetVolume increases streaming media volume by 0.05", async () => {
    const original = await sonar.getVolume(StreamRedirectionId.Streaming, Channel.Media);

    await sonar.setVolume(StreamRedirectionId.Streaming, Channel.Media, 0.5);
    const ok = await sonar.offsetVolume(
      StreamRedirectionId.Streaming,
      Channel.Media,
      0.05,
    );
    expect(ok).toBe(true);

    const updated = await sonar.getVolume(StreamRedirectionId.Streaming, Channel.Media);
    expect(Math.round(updated.volume * 100)).toBe(55);

    await sonar.setVolume(StreamRedirectionId.Streaming, Channel.Media, original.volume);
  });

  test("getAudioDevices returns a non-empty device list", async () => {
    const devices = await sonar.getAudioDevices();
    expect(Array.isArray(devices)).toBe(true);
    expect(devices.length).toBeGreaterThan(0);
  });
});
