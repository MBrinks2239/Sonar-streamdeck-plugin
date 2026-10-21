import { InvalidMixVolumeError, InvalidVolumeError } from "../types/errors";
import { ChannelVolume, ChatMix, convertVolumeDataToVolumes, Volumes } from "../types/volume-classic";
import { clamp, formatVolumeForUrl, isValidVolume } from "../util/util";
import { Channel } from "../types/channels";
import {
  AudioDevice,
  AudioDeviceDto,
  AudioDeviceType,
  convertDtoToAudioDevice,
  findAudioDevice,
  SavedAudioDevice,
} from "../types/audio-device";
import { convertChannelNameToHumanReadable } from "../util/channel";
import { VolumeData } from "../types/volume-data";
import { getSonarConnection, SonarConnection } from "./sonar-connection";

export default class SonarClassic {
  private readonly volumePath: string = "/volumeSettings/classic";
  private readonly connection: SonarConnection;
  public static readonly channelNames = [
    "master",
    "game",
    "chatRender",
    "media",
    "aux",
    "chatCapture",
  ];

  constructor(appDataPath: string | null = null) {
    this.connection = getSonarConnection(appDataPath);
  }

  /** Resolves once the Sonar web server has been found; rejects if GG or Sonar is not running. */
  async waitForInitialization(): Promise<void> {
    await this.connection.getAddress();
  }

  // ------ Mode ------
  async isClassicMode(): Promise<boolean> {
    return (await this.connection.getMode()) === "classic";
  }

  async requireClassicMode(): Promise<void> {
    await this.connection.requireMode("classic");
  }

  // ------ Volume control ------
  async getVolumes(): Promise<Volumes> {
    const data = await this.connection.request<VolumeData>("GET", this.volumePath);
    return convertVolumeDataToVolumes(data);
  }

  async getVolume(channel: Channel): Promise<ChannelVolume> {
    const volumes = await this.getVolumes();
    return volumes[channel];
  }

  async setVolume(channel: Channel, volume: number): Promise<boolean> {
    if (!isValidVolume(volume))
      throw new InvalidVolumeError(volume);
    await this.connection.request("PUT", `${this.volumePath}/${channel}/Volume/${formatVolumeForUrl(volume)}`);
    return true;
  }

  async offsetVolume(channel: Channel, offset: number): Promise<boolean> {
    const currentVolume = await this.getVolume(channel);
    const newVolume = clamp(currentVolume.volume + offset, 0, 1);
    return this.setVolume(channel, newVolume);
  }


  // ------ Muting channel ------
  async muteChannel(channel: Channel, muted: boolean): Promise<boolean> {
    await this.connection.request("PUT", `${this.volumePath}/${channel}/Mute/${JSON.stringify(muted)}`);
    return true;
  }

  async toggleMuteChannel(channel: Channel): Promise<boolean> {
    const currentVolume = await this.getVolume(channel);
    return this.muteChannel(channel, !currentVolume.muted);
  }


  // ------ Chat Mix ------
  async getChatMix(): Promise<ChatMix> {
    const data = await this.connection.request<ChatMix>("GET", "/chatMix");
    return {
      balance: data.balance
    };
  }

  async setChatMixBalance(balance: number): Promise<boolean> {
    if (!(balance >= -1 && balance <= 1))
      throw new InvalidMixVolumeError(balance);

    await this.connection.request("PUT", `/chatMix?balance=${JSON.stringify(balance)}`);
    return true;
  }

  // ------ Audio devices ------
  async getAudioDevices(): Promise<AudioDevice[]> {
    const data = await this.connection.request<AudioDeviceDto[]>("GET", "/audioDevices");
    return data.filter((device) => device.role === "none").map(convertDtoToAudioDevice);
  }

  // ------ Output control ------
  /** Routes a channel to a device. `Master` routes all four output channels. */
  async switchDevice(channel: Channel, device: SavedAudioDevice): Promise<boolean> {
    const deviceType = channel === Channel.Mic ? AudioDeviceType.Input : AudioDeviceType.Output;
    if (device.type && device.type !== deviceType) {
      throw new Error(`Provided audio device is not an ${deviceType} device`);
    }

    // Use the id of the device that was actually found, which differs when it matched by name.
    const target = findAudioDevice(await this.getAudioDevices(), device, deviceType);
    const channels = channel === Channel.Master
      ? [Channel.Game, Channel.Chat, Channel.Media, Channel.Aux]
      : [channel];
    for (const outputChannel of channels) {
      await this.connection.request(
        "PUT",
        `/ClassicRedirections/${convertChannelNameToHumanReadable(outputChannel)}/deviceId/${encodeURIComponent(target.id)}`,
      );
    }
    return true;
  }
}
