import { InvalidVolumeError } from "../types/errors";
import { Channel } from "../types/channels";
import { StreamRedirectionId } from "../types/stream-redirection";
import {
  AudioDevice,
  AudioDeviceDto,
  AudioDeviceType,
  convertDtoToAudioDevice,
  findAudioDevice,
  SavedAudioDevice,
} from "../types/audio-device";
import { ChannelVolume, convertVolumeDataToStreamerVolumes, StreamerVolumes } from "../types/volume-streamer";
import { clamp, formatVolumeForUrl, isValidVolume } from "../util/util";
import { VolumeData } from "../types/volume-data";
import { getSonarConnection, SonarConnection } from "./sonar-connection";

export default class SonarStreamer {
  private readonly volumePath: string = "/volumeSettings/streamer";
  private readonly connection: SonarConnection;

  constructor(appDataPath: string | null = null) {
    this.connection = getSonarConnection(appDataPath);
  }

  /** Resolves once the Sonar web server has been found; rejects if GG or Sonar is not running. */
  async waitForInitialization(): Promise<void> {
    await this.connection.getAddress();
  }

  // ------ Mode ------
  async isStreamerMode(): Promise<boolean> {
    return (await this.connection.getMode()) === "stream";
  }

  async requireStreamerMode(): Promise<void> {
    await this.connection.requireMode("stream");
  }

  async setStreamerMode(enabled: boolean): Promise<boolean> {
    const mode = enabled ? "stream" : "classic";
    const data = await this.connection.request<string>("PUT", `/mode/${mode}`);
    this.connection.forgetMode();
    return data === "stream";
  }

  // ------ Volume control ------
  async getVolumes(): Promise<StreamerVolumes> {
    const data = await this.connection.request<VolumeData>("GET", this.volumePath);
    return convertVolumeDataToStreamerVolumes(data);
  }

  async getVolume(slider: StreamRedirectionId, channel: Channel): Promise<ChannelVolume> {
    const volumes = await this.getVolumes();
    return volumes[slider][channel];
  }

  async setVolume(
    slider: StreamRedirectionId,
    channel: Channel,
    volume: number,
  ): Promise<boolean> {
    if (!isValidVolume(volume)) throw new InvalidVolumeError(volume);

    await this.connection.request("PUT", this.buildVolumePath(slider, channel, "volume", formatVolumeForUrl(volume)));
    return true;
  }

  async offsetVolume(
    slider: StreamRedirectionId,
    channel: Channel,
    offset: number,
  ): Promise<boolean> {
    const current = await this.getVolume(slider, channel);
    const newVolume = clamp(current.volume + offset, 0, 1);
    return this.setVolume(slider, channel, newVolume);
  }

  // ------ Muting channel ------
  async muteChannel(
    slider: StreamRedirectionId,
    channel: Channel,
    muted: boolean,
  ): Promise<boolean> {
    await this.connection.request("PUT", this.buildVolumePath(slider, channel, "isMuted", JSON.stringify(muted)));
    return true;
  }

  async toggleMuteChannel(
    slider: StreamRedirectionId,
    channel: Channel,
  ): Promise<boolean> {
    const current = await this.getVolume(slider, channel);
    return this.muteChannel(slider, channel, !current.muted);
  }

  private buildVolumePath(
    slider: StreamRedirectionId,
    channel: Channel,
    property: "volume" | "isMuted",
    value: string,
  ): string {
    // Master volume/mute lives under `/master/...` while other channels use the channel role name.
    const role = channel === Channel.Master ? "master" : channel;
    return `${this.volumePath}/${slider}/${role}/${property}/${value}`;
  }

  // ------ Audio devices ------
  async getAudioDevices(): Promise<AudioDevice[]> {
    const data = await this.connection.request<AudioDeviceDto[]>("GET", "/audioDevices");
    return data
      .filter((device) => device.role === "none")
      .map(convertDtoToAudioDevice);
  }

  // ------ Stream redirection output ------
  async switchStreamOutput(
    slider: StreamRedirectionId,
    outputDevice: SavedAudioDevice,
  ): Promise<boolean> {
    const device = findAudioDevice(await this.getAudioDevices(), outputDevice, AudioDeviceType.Output);
    await this.connection.request("PUT", `/StreamRedirections/${slider}/deviceId/${encodeURIComponent(device.id)}`);
    return true;
  }

  async clearStreamOutput(slider: StreamRedirectionId): Promise<boolean> {
    await this.connection.request("DELETE", `/StreamRedirections/${slider}/deviceId`);
    return true;
  }

  /** In Streamer mode the classic mic redirection is accepted but has no effect, so use this one. */
  async switchMicInput(inputDevice: SavedAudioDevice): Promise<boolean> {
    const device = findAudioDevice(await this.getAudioDevices(), inputDevice, AudioDeviceType.Input);
    await this.connection.request("PUT", `/StreamRedirections/mic/deviceId/${encodeURIComponent(device.id)}`);
    return true;
  }

  // ------ Stream monitoring ------
  /** Whether the monitoring device (e.g. your headset) plays the Streaming mix instead of the personal mix. */
  async getStreamMonitoring(): Promise<boolean> {
    return (await this.connection.request<boolean>("GET", "/streamRedirections/isStreamMonitoringEnabled")) === true;
  }

  async setStreamMonitoring(enabled: boolean): Promise<boolean> {
    await this.connection.request("PUT", `/streamRedirections/isStreamMonitoringEnabled/${JSON.stringify(enabled)}`);
    return true;
  }
}
