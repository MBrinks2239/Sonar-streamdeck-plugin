import streamDeck, {
  action,
  DialDownEvent,
  DialRotateEvent,
  FeedbackPayload,
  SingletonAction,
  TouchTapEvent,
  WillAppearEvent,
  WillDisappearEvent,
} from "@elgato/streamdeck";
import SonarStreamer from "../../managers/streamer-sonar";
import { getChannelIcon, getNextChannel } from "../../util/channel";
import { Channel, enumKeyFromValue } from "../../types/channels";
import { StreamRedirectionId } from "../../types/stream-redirection";
import { clamp } from "../../util/util";
import { ChannelVolume } from "../../types/volume-streamer";

@action({ UUID: "com.stellar.steelseries-sonar-controls.streamer.volume-dial" })
export class StreamerVolumeDial extends SingletonAction<StreamerVolumeDialSettings> {
  private readonly sonarInstance = new SonarStreamer();
  private intervalId: NodeJS.Timeout | null = null;

  override async onWillAppear(
    ev: WillAppearEvent<StreamerVolumeDialSettings>,
  ): Promise<void> {
    if (!ev.action.isDial()) return;

    const settings = ev.payload.settings;
    if (!settings.selectedChannel) settings.selectedChannel = Channel.Master;
    if (!settings.selectedSlider) settings.selectedSlider = StreamRedirectionId.Streaming;
    if (!settings.stepSize) settings.stepSize = 5;

    ev.action.setSettings(settings);
    this.intervalId = setInterval(
      this.updateDisplay,
      1000,
      this.sonarInstance,
      ev.action,
    );
  }

  override onWillDisappear(
    ev: WillDisappearEvent<StreamerVolumeDialSettings>,
  ): Promise<void> | void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  override async onDialRotate(
    ev: DialRotateEvent<StreamerVolumeDialSettings>,
  ): Promise<void> {
    const slider = ev.payload.settings.selectedSlider || StreamRedirectionId.Streaming;
    const channel = ev.payload.settings.selectedChannel || Channel.Master;
    const stepSize = Number(ev.payload.settings.stepSize) || 1;

    try {
      const current = await this.sonarInstance.getVolume(slider, channel);
      const step = stepSize / 100;
      const newVolume = clamp(current.volume + step * ev.payload.ticks, 0, 1);

      await this.sonarInstance.setVolume(slider, channel, newVolume);

      ev.action.setFeedback({
        indicator: newVolume * 100,
        value: getVolumeLabel({ volume: newVolume, muted: current.muted }),
        title: formatTitle(slider, channel),
      } as FeedbackPayload);
    } catch (err) {
      streamDeck.logger.error(`Streamer volume-dial rotate failed: ${err}`);
    }
  }

  override async onTouchTap(
    ev: TouchTapEvent<StreamerVolumeDialSettings>,
  ): Promise<void> {
    ev.action.setSettings({
      ...ev.payload.settings,
      selectedChannel: getNextChannel(ev.payload.settings.selectedChannel) as Channel,
    });
    this.updateDisplay(this.sonarInstance, ev.action);
  }

  override async onDialDown(
    ev: DialDownEvent<StreamerVolumeDialSettings>,
  ): Promise<void> {
    const slider = ev.payload.settings.selectedSlider || StreamRedirectionId.Streaming;
    const channel = ev.payload.settings.selectedChannel || Channel.Master;
    try {
      const current = await this.sonarInstance.getVolume(slider, channel);
      await this.sonarInstance.muteChannel(slider, channel, !current.muted);
      this.updateDisplay(this.sonarInstance, ev.action);
    } catch (err) {
      streamDeck.logger.error(`Streamer volume-dial mute failed: ${err}`);
    }
  }

  private async updateDisplay(sonarInstance: SonarStreamer, action: any) {
    const settings = await action.getSettings();
    const volume = await sonarInstance.getVolume(settings.selectedSlider, settings.selectedChannel);
    action.setFeedback({
      indicator: volume.volume * 100,
      value: getVolumeLabel(volume),
      title: formatTitle(settings.selectedSlider, settings.selectedChannel),
      icon: getChannelIcon(settings.selectedChannel),
    } as FeedbackPayload);
  }
}

function getVolumeLabel(volume: ChannelVolume): string {
  if (volume.muted) return "Muted";
  return `${Math.round(volume.volume * 100)}%`;
}

function formatTitle(slider: StreamRedirectionId, channel: Channel): string {
  const sliderKey = enumKeyFromValue(StreamRedirectionId, slider) ?? slider;
  const channelKey = enumKeyFromValue(Channel, channel) ?? channel;
  return `${sliderKey} / ${channelKey}`;
}

type StreamerVolumeDialSettings = {
  selectedSlider: StreamRedirectionId;
  selectedChannel: Channel;
  stepSize: number | string;
};
