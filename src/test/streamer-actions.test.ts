import SonarStreamer from "../managers/streamer-sonar";
import Channel from "../types/channels";
import { StreamRedirectionId } from "../types/stream-redirection";

// Reproduces the core logic of each action, bypassing the streamDeck decorator
// so we can confirm the HTTP calls the actions make actually mutate Sonar state.

describe("Streamer action logic (integration against live Sonar)", () => {
  const sonar = new SonarStreamer();

  beforeAll(async () => {
    await sonar.waitForInitialization();
  });

  test("set-volume increments game streaming by 10%", async () => {
    await sonar.setVolume(StreamRedirectionId.Streaming, Channel.Game, 0.5);

    // Mirrors StreamerSetVolume.onKeyDown
    const settings = {
      selectedSlider: StreamRedirectionId.Streaming,
      selectedChannel: Channel.Game,
      stepSize: "10",
      increment: true,
    };
    const stepSize = Number(settings.stepSize) || 5;
    const current = await sonar.getVolume(settings.selectedSlider, settings.selectedChannel);
    const delta = (settings.increment ? stepSize : -stepSize) / 100;
    const newVolume = Math.min(Math.max(current.volume + delta, 0), 1);
    await sonar.setVolume(settings.selectedSlider, settings.selectedChannel, newVolume);

    const after = await sonar.getVolume(StreamRedirectionId.Streaming, Channel.Game);
    expect(Math.round(after.volume * 100)).toBe(60);
  });

  test("set-volume uses default stepSize of 5 when not configured", async () => {
    await sonar.setVolume(StreamRedirectionId.Streaming, Channel.Aux, 0.5);

    // Reproduces onKeyDown with undefined stepSize
    const settings = {
      selectedSlider: StreamRedirectionId.Streaming,
      selectedChannel: Channel.Aux,
      stepSize: undefined as unknown as number,
      increment: true,
    };
    const stepSize = Number(settings.stepSize) || 5;
    expect(stepSize).toBe(5);

    const current = await sonar.getVolume(settings.selectedSlider, settings.selectedChannel);
    const delta = (settings.increment ? stepSize : -stepSize) / 100;
    const newVolume = current.volume + delta;
    await sonar.setVolume(settings.selectedSlider, settings.selectedChannel, newVolume);

    const after = await sonar.getVolume(StreamRedirectionId.Streaming, Channel.Aux);
    expect(Math.round(after.volume * 100)).toBe(55);
  });

  test("mute-channel toggles chat render monitoring", async () => {
    const before = await sonar.getVolume(StreamRedirectionId.Monitoring, Channel.Chat);
    await sonar.toggleMuteChannel(StreamRedirectionId.Monitoring, Channel.Chat);

    const after = await sonar.getVolume(StreamRedirectionId.Monitoring, Channel.Chat);
    expect(after.muted).toBe(!before.muted);

    // restore
    await sonar.muteChannel(StreamRedirectionId.Monitoring, Channel.Chat, before.muted);
  });

  test("master streaming mute toggles", async () => {
    const before = await sonar.getVolume(StreamRedirectionId.Streaming, Channel.Master);
    await sonar.toggleMuteChannel(StreamRedirectionId.Streaming, Channel.Master);

    const after = await sonar.getVolume(StreamRedirectionId.Streaming, Channel.Master);
    expect(after.muted).toBe(!before.muted);

    await sonar.muteChannel(StreamRedirectionId.Streaming, Channel.Master, before.muted);
  });

  test("switch-output sets stream redirection to an available device", async () => {
    const devices = await sonar.getAudioDevices();
    expect(devices.length).toBeGreaterThan(0);

    const output = devices.find((d) => d.type === "output");
    if (!output) throw new Error("no output device available");

    const ok = await sonar.switchStreamOutput(StreamRedirectionId.Monitoring, output);
    expect(ok).toBe(true);
  });
});
