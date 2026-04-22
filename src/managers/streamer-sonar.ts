import * as fs from "node:fs";
import * as path from "node:path";
import axios from "axios";
import * as https from "node:https";
import {
  EnginePathNotFoundError,
  InvalidVolumeError,
  ServerNotAccessibleError,
  ServerNotReadyError,
  ServerNotRunningError,
  SonarNotEnabledError,
  WebServerAddressNotFoundError,
} from "../types/errors";
import { Channel } from "../types/channels";
import { StreamRedirectionId } from "../types/stream-redirection";
import { AudioDevice, AudioDeviceDto, convertDtoToAudioDevice } from "../types/audio-device";
import { ChannelVolume, convertVolumeDataToStreamerVolumes, StreamerVolumes } from "../types/volume-streamer";
import { clamp } from "../util/util";
import { VolumeData } from "../types/volume-data";

// Create an axios instance allowing self-signed certificates
const axiosInstance = axios.create({
  httpsAgent: new https.Agent({
    rejectUnauthorized: false, // Allow self-signed certificates
  }),
});

export default class SonarStreamer {
  private readonly volumePath: string = "volumeSettings/streamer";
  private readonly appDataPath: string;
  private baseUrl!: string;
  private webServerAddress!: string;

  constructor(appDataPath: string | null = null) {
    this.appDataPath =
      appDataPath ??
      path.join(
        process.env["ProgramData"] ?? "",
        "SteelSeries",
        "SteelSeries Engine 3",
        "coreProps.json",
      );

    this.init();
  }

  async waitForInitialization(): Promise<void> {
    while (!this.webServerAddress) {
      try {
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        console.error("Error during initialization:", error);
      }
    }
  }

  private loadBaseUrl(): void {
    if (!fs.existsSync(this.appDataPath)) throw new EnginePathNotFoundError();

    const data = fs.readFileSync(this.appDataPath, "utf8");
    const commonAppData = JSON.parse(data);
    this.baseUrl = `https://${commonAppData.ggEncryptedAddress}`;
  }

  private async init(): Promise<void> {
    this.loadBaseUrl();
    const response = await axiosInstance.get(`${this.baseUrl}/subApps`);

    if (response.status !== 200)
      throw new ServerNotAccessibleError(response.status);

    const steelseriesState = response.data;
    if (!steelseriesState.subApps.sonar.isEnabled)
      throw new SonarNotEnabledError();
    if (!steelseriesState.subApps.sonar.isReady)
      throw new ServerNotReadyError();
    if (!steelseriesState.subApps.sonar.isRunning)
      throw new ServerNotRunningError();

    this.webServerAddress =
      steelseriesState.subApps.sonar.metadata.webServerAddress;
    if (!this.webServerAddress) throw new WebServerAddressNotFoundError();
  }

  // ------ Mode ------
  async isStreamerMode(): Promise<boolean> {
    const response = await axiosInstance.get(`${this.webServerAddress}/mode/`);
    if (response.status !== 200)
      throw new ServerNotAccessibleError(response.status);
    return response.data === "stream";
  }

  async setStreamerMode(enabled: boolean): Promise<boolean> {
    const mode = enabled ? "stream" : "classic";
    const response = await axiosInstance.put(`${this.webServerAddress}/mode/${mode}`);
    if (response.status !== 200)
      throw new ServerNotAccessibleError(response.status);
    return response.data === "stream";
  }

  // ------ Volume control ------
  async getVolumes(): Promise<StreamerVolumes> {
    const response = await axiosInstance.get(
      `${this.webServerAddress}/${this.volumePath}`,
    );
    return convertVolumeDataToStreamerVolumes(response.data as VolumeData);
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
    if (volume < 0 || volume > 1) throw new InvalidVolumeError(volume);

    const url = this.buildVolumeUrl(slider, channel, "volume", JSON.stringify(volume));
    const response = await axiosInstance.put(url);
    return response.status === 200;
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
    const url = this.buildVolumeUrl(slider, channel, "isMuted", JSON.stringify(muted));
    const response = await axiosInstance.put(url);
    return response.status === 200;
  }

  async toggleMuteChannel(
    slider: StreamRedirectionId,
    channel: Channel,
  ): Promise<boolean> {
    const current = await this.getVolume(slider, channel);
    return this.muteChannel(slider, channel, !current.muted);
  }

  private buildVolumeUrl(
    slider: StreamRedirectionId,
    channel: Channel,
    property: "volume" | "isMuted",
    value: string,
  ): string {
    // Master volume/mute lives under `/master/...` while other channels use the channel role name.
    const role = channel === Channel.Master ? "master" : channel;
    return `${this.webServerAddress}/${this.volumePath}/${slider}/${role}/${property}/${value}`;
  }

  // ------ Audio devices ------
  async getAudioDevices(): Promise<AudioDevice[]> {
    const response = await axiosInstance.get(
      `${this.webServerAddress}/audioDevices`,
    );
    if (response.status !== 200)
      throw new ServerNotAccessibleError(response.status);

    return response.data
      .filter((device: AudioDeviceDto) => device.role === "none")
      .map(convertDtoToAudioDevice);
  }

  // ------ Stream redirection output ------
  async switchStreamOutput(
    slider: StreamRedirectionId,
    outputDevice: AudioDevice,
  ): Promise<boolean> {
    const availableDevices = await this.getAudioDevices();
    const deviceExists =
      availableDevices.find((d) => d.id === outputDevice.id) ||
      availableDevices.find((d) => d.name === outputDevice.name);

    if (!deviceExists) {
      throw new Error("Provided audio device is not available");
    }

    const url = `${this.webServerAddress}/StreamRedirections/${slider}/deviceId/${deviceExists.id}`;
    const response = await axiosInstance.put(url);
    return response.status === 200;
  }

  async clearStreamOutput(slider: StreamRedirectionId): Promise<boolean> {
    const url = `${this.webServerAddress}/StreamRedirections/${slider}/deviceId`;
    const response = await axiosInstance.delete(url);
    return response.status === 200;
  }
}
