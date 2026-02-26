import * as fs from "node:fs";
import * as path from "node:path";
import streamDeck from "@elgato/streamdeck";
import axios from "axios";
import * as https from "node:https";
import {
  EnginePathNotFoundError,
  InvalidMixVolumeError,
  InvalidVolumeError,
  ServerNotAccessibleError,
  ServerNotReadyError,
  ServerNotRunningError,
  SonarNotEnabledError,
  WebServerAddressNotFoundError,
} from "../types/errors";
import { ChannelVolume, ChatMix, convertVolumeDataToVolumes, Volumes } from "../types/volume-classic";
import { clamp } from "../util/util";
import { Channel } from "../types/channels";
import { AudioDevice, AudioDeviceDto, convertDtoToAudioDevice } from "../types/audio-device";

// Create an axios instance allowing self-signed certificates
const axiosInstance = axios.create({
  httpsAgent: new https.Agent({
    rejectUnauthorized: false, // Allow self-signed certificates
  }),
});

export default class SonarClassic {
  private readonly volumePath: string = "volumeSettings/classic";
  private readonly appDataPath: string;
  private baseUrl!: string;
  private webServerAddress!: string;
  public static readonly channelNames = [
    "master",
    "game",
    "chatRender",
    "media",
    "aux",
    "chatCapture",
  ];

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

  // ------ Volume control ------
  async getVolumes(): Promise<Volumes> {
    const response = await axiosInstance.get(
      `${this.webServerAddress}/${this.volumePath}`,
    );

    return convertVolumeDataToVolumes(response.data);
  }

  async getVolume(channel: Channel): Promise<ChannelVolume> {
    const volumes = await this.getVolumes();
    return volumes[channel];
  }

  async setVolume(channel: Channel, volume: number): Promise<boolean> {
    if (volume < 0 || volume > 1)
      throw new InvalidVolumeError(volume);
    const url = `${this.webServerAddress}/${this.volumePath}/${channel}/Volume/${JSON.stringify(volume)}`;
    const response = await axiosInstance.put(url);
    return response.status === 200;
  }

  async offsetVolume(channel: Channel, offset: number): Promise<boolean> {
    const currentVolume = await this.getVolume(channel);
    const newVolume = clamp(currentVolume.volume + offset, 0, 1);
    return this.setVolume(channel, newVolume);
  }

  
  // ------ Muting channel ------
  async muteChannel(channel: Channel, muted: boolean): Promise<boolean> {
    const url = `${this.webServerAddress}/${this.volumePath}/${channel}/Mute/${JSON.stringify(muted)}`;
    const response = await axiosInstance.put(url);
    return response.status === 200;
  }

  async toggleMuteChannel(channel: Channel): Promise<boolean> {
    const currentVolume = await this.getVolume(channel);
    return this.muteChannel(channel, !currentVolume.muted);
  }


  // ------ Chat Mix ------
  async getChatMix(): Promise<ChatMix> {
    const response = await axiosInstance.get(
      `${this.webServerAddress}/chatMix`,
    );
    const data = response.data;
    return {
      balance: data.balance
    };
  }

  async setChatMixBalance(balance: number): Promise<boolean> {
    if (balance < -1 || balance > 1)
      throw new InvalidMixVolumeError(balance);

    const url = `${this.webServerAddress}/chatMix?balance=${JSON.stringify(balance)}`;
    const response = await axiosInstance.put(url);
    return response.status === 200;
  }

  // ------ Audio devices ------
  async getAudioDevices(): Promise<AudioDevice[]> {
    const response = await axiosInstance.get(
      `${this.webServerAddress}/audioDevices`,
    );
    if (response.status !== 200)
      throw new ServerNotAccessibleError(response.status);

    return response.data.filter((device: AudioDeviceDto) => device.role === "none").map(convertDtoToAudioDevice);
  }

  // ------ Output control ------
  async switchDevice(channel: Channel, outputDevice: AudioDevice): Promise<boolean> {
    const deviceType = channel === Channel.Mic ? "input" : "output";
    streamDeck.logger.info(`Switching output for channel: ${channel} to output device: ${outputDevice.name}`);
    streamDeck.logger.info(`Expected device type: ${deviceType}`);
    streamDeck.logger.info(`Actual device type: ${outputDevice.type}`);
    if (outputDevice.type !== deviceType) {
      throw new Error(`Provided audio device is not an ${deviceType} device`);
    }

    if (channel === Channel.Master) {
      let success = true;
       success = success && await this.switchOutputOfChannel(Channel.Game, outputDevice);
       success = success && await this.switchOutputOfChannel(Channel.Chat, outputDevice);
       success = success && await this.switchOutputOfChannel(Channel.Media, outputDevice);
       success = success && await this.switchOutputOfChannel(Channel.Aux, outputDevice);
      return success;
    }
    return this.switchOutputOfChannel(channel, outputDevice);
  }

  private async switchOutputOfChannel(channel: Channel, outputDevice: AudioDevice): Promise<boolean> {
    if (channel === Channel.Master) {
      throw new Error("Master channels do not have an output");
    }

    const deviceType = channel === Channel.Mic ? "input" : "output";

    const availableDevices = await this.getAudioDevices();
    const deviceExists = availableDevices.find(
      (device) => device.id === outputDevice.id && device.type === deviceType,
    ) || availableDevices.find(
      (device) => device.name === outputDevice.name && device.type === deviceType,
    );

    if (!deviceExists) {
      throw new Error("Provided audio device is not available");
    }

    const url = `${this.webServerAddress}/ClassicRedirections/${channel}/deviceId/${outputDevice.id}`;
    const response = await axiosInstance.put(url, outputDevice);
    return response.status === 200;
  }
}
