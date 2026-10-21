import { action } from "@elgato/streamdeck";
import SonarStreamer from "../../managers/streamer-sonar";
import { Channel, enumKeyFromValue } from "../../types/channels";
import { StreamRedirectionId } from "../../types/stream-redirection";
import { VolumeDialBase, VolumeDialSettings, VolumeLookup } from "../volume-dial-base";

@action({ UUID: "com.stellar.steelseries-sonar-controls.streamer.volume-dial" })
export class StreamerVolumeDial extends VolumeDialBase<StreamerVolumeDialSettings> {
  private readonly sonarInstance = new SonarStreamer();
  protected readonly label: string = "Streamer volume-dial";
  protected readonly wrongModeText = "Streamer only";

  protected withDefaults(settings: Partial<StreamerVolumeDialSettings>): StreamerVolumeDialSettings {
    return {
      ...settings,
      selectedChannel: settings.selectedChannel || Channel.Master,
      selectedSlider: settings.selectedSlider || StreamRedirectionId.Streaming,
      stepSize: settings.stepSize || 5,
    };
  }

  protected getTitle(settings: StreamerVolumeDialSettings): string {
    return formatTitle(settings.selectedSlider, settings.selectedChannel);
  }

  protected isActiveMode(): Promise<boolean> {
    return this.sonarInstance.isStreamerMode();
  }

  protected async loadVolumes(): Promise<VolumeLookup<StreamerVolumeDialSettings>> {
    const volumes = await this.sonarInstance.getVolumes();
    return (settings) => volumes[settings.selectedSlider][settings.selectedChannel];
  }

  protected setVolume(settings: StreamerVolumeDialSettings, volume: number): Promise<boolean> {
    return this.sonarInstance.setVolume(settings.selectedSlider, settings.selectedChannel, volume);
  }

  protected setMute(settings: StreamerVolumeDialSettings, muted: boolean): Promise<boolean> {
    return this.sonarInstance.muteChannel(settings.selectedSlider, settings.selectedChannel, muted);
  }
}

function formatTitle(slider: StreamRedirectionId, channel: Channel): string {
  const sliderKey = enumKeyFromValue(StreamRedirectionId, slider) ?? slider;
  const channelKey = enumKeyFromValue(Channel, channel) ?? channel;
  return `${sliderKey} / ${channelKey}`;
}

export type StreamerVolumeDialSettings = VolumeDialSettings & {
  selectedSlider: StreamRedirectionId;
};
