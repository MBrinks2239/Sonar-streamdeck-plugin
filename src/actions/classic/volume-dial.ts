import streamDeck, {
  action,
  DialRotateEvent,
  FeedbackPayload,
  SingletonAction,
  WillAppearEvent,
  WillDisappearEvent,
} from "@elgato/streamdeck";
import sonar from "../../managers/sonar-controller";
import { VolumeData } from "../../types/volume-data";

@action({ UUID: "com.stellar.steelseries-sonar-controls.volume-dial" })
export class SetVolumeDial extends SingletonAction<SetVolumeDialSettings> {
  private readonly sonarInstance = new sonar();
  private intervalId: NodeJS.Timeout | null = null;

  	override async onWillAppear(
		ev: WillAppearEvent<SetVolumeDialSettings>
	): Promise<void> {
		if (!ev.action.isDial()) return;

		let settings = ev.payload.settings;
		if (!settings.selectedChannel) settings.selectedChannel = "master";
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
    streamDeck.logger.info(
      `Set volume for channel: ${ev.payload.settings.selectedChannel}`,
    );
    const channel = ev.payload.settings.selectedChannel;
    const response = await this.sonarInstance.getVolumeData();

    let volume = getVolumeOfChannel(channel, response);

    const step = (ev.payload.settings.stepSize ?? 1) / 100;

    const newVolume = clamp(volume + step * ev.payload.ticks, 0, 1);

    await this.sonarInstance.setVolume(channel, newVolume);

    ev.action.setFeedback({
      indicator: newVolume * 100,
      value: `${Math.round(newVolume * 100)}%`,
      title: ev.payload.settings.selectedChannel.toUpperCase(),
    } as FeedbackPayload);
  }

  private async updateDisplay(sonarInstance: any, action: any) {
    const settings = await action.getSettings();
    const channel = settings.selectedChannel;
    const response = await sonarInstance.getVolumeData();
    let volume = getVolumeOfChannel(channel, response);
    action.setFeedback({
      indicator: volume * 100,
      value: `${Math.round(volume * 100)}%`,
      title: settings.selectedChannel.toUpperCase(),
    } as FeedbackPayload);
  }
}

function getVolumeOfChannel(channel: string, response: VolumeData): number {
  let volume = 0;
  switch (channel) {
    case "master":
      volume = response.masters.classic.volume;
      break;
    case "game":
      volume = response.devices.game.classic.volume;
      break;
    case "chatRender":
      volume = response.devices.chatRender.classic.volume;
      break;
    case "media":
      volume = response.devices.media.classic.volume;
      break;
    case "aux":
      volume = response.devices.aux.classic.volume;
      break;
    case "chatCapture":
      volume = response.devices.chatCapture.classic.volume;
      break;
  }
  return volume;
}

/**
 * Settings for {@link SetVolumeDial}.
 */
type SetVolumeDialSettings = {
  selectedChannel: string;
  stepSize: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

