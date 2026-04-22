import {
  action,
  DialDownEvent,
  DialRotateEvent,
  FeedbackPayload,
  SingletonAction,
  TouchTapEvent,
  WillAppearEvent,
  WillDisappearEvent,
} from "@elgato/streamdeck";
import SonarClassic from "../../managers/classic-sonar";
import { getChannelIcon, getNextChannel } from "../../util/channel";
import { Channel, enumKeyFromValue } from "../../types/channels";
import { clamp } from "../../util/util";
import { ChannelVolume } from "../../types/volume-classic";

@action({ UUID: "com.stellar.steelseries-sonar-controls.classic.volume-dial" })
export class SetVolumeDial extends SingletonAction<SetVolumeDialSettings> {
  private readonly sonarInstance = new SonarClassic();
  private intervalId: NodeJS.Timeout | null = null;

  	override async onWillAppear(
		ev: WillAppearEvent<SetVolumeDialSettings>
	): Promise<void> {
		if (!ev.action.isDial()) return;

		let settings = ev.payload.settings;
		if (!settings.selectedChannel) settings.selectedChannel = Channel.Master;
		if (!settings.stepSize) settings.stepSize = 5;

		ev.action.setSettings(settings);
		this.intervalId = setInterval(
			this.updateDisplay,
			1000,
      this.sonarInstance,
			ev.action
		);
	}

	override onWillDisappear(
		ev: WillDisappearEvent<SetVolumeDialSettings>
	): Promise<void> | void {
		if (this.intervalId) {
			clearInterval(this.intervalId);
			this.intervalId = null;
		}
	}

  override async onDialRotate(ev: DialRotateEvent<SetVolumeDialSettings>): Promise<void> {
    const channel = ev.payload.settings.selectedChannel;
    const volume = await this.sonarInstance.getVolume(channel);

    const step = (ev.payload.settings.stepSize ?? 1) / 100;

    const newVolume = clamp(volume.volume + step * ev.payload.ticks, 0, 1);

    await this.sonarInstance.setVolume(channel, newVolume);

    ev.action.setFeedback({
      indicator: newVolume * 100,
      value: getVolumeLabel({ volume: newVolume, muted: volume.muted }),
      title: enumKeyFromValue(Channel, ev.payload.settings.selectedChannel)
    } as FeedbackPayload);
  }

  override async onTouchTap(ev: TouchTapEvent<SetVolumeDialSettings>): Promise<void> {
    ev.action.setSettings({
      ...ev.payload.settings,
      selectedChannel: getNextChannel(ev.payload.settings.selectedChannel),
    });
    this.updateDisplay(this.sonarInstance, ev.action);
  }

  override async onDialDown(ev: DialDownEvent<SetVolumeDialSettings>): Promise<void> {
    const volume = await this.sonarInstance.getVolume(ev.payload.settings.selectedChannel);
    this.sonarInstance.muteChannel(ev.payload.settings.selectedChannel, !volume.muted);
    this.updateDisplay(this.sonarInstance, ev.action);
  }

  private async updateDisplay(sonarInstance: SonarClassic, action: any) {
    const settings = await action.getSettings();
    const channel = settings.selectedChannel;
    const volume = await sonarInstance.getVolume(channel);
    action.setFeedback({
      indicator: volume.volume * 100,
      value: getVolumeLabel(volume),
      title: enumKeyFromValue(Channel, settings.selectedChannel),
      icon: getChannelIcon(settings.selectedChannel),
    } as FeedbackPayload);
  }
}

function getVolumeLabel(volume: ChannelVolume): string {
  if (volume.muted) return "Muted";
  return `${Math.round(volume.volume * 100)}%`;
}

/**
 * Settings for {@link SetVolumeDial}.
 */
type SetVolumeDialSettings = {
  selectedChannel: Channel;
  stepSize: number;
};
