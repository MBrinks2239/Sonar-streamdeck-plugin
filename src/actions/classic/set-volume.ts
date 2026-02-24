import streamDeck, {
  action,
  DialAction,
  KeyAction,
  KeyDownEvent,
  SingletonAction,
} from "@elgato/streamdeck";
import sonar from "../../managers/sonar-controller";
import { VolumeData } from "../../types/volume-data";

@action({ UUID: "com.stellar.steelseries-sonar-controls.set-volume" })
export class SetVolume extends SingletonAction<SetVolumeSettings> {
  private readonly sonarInstance = new sonar();

  override async onKeyDown(ev: KeyDownEvent<SetVolumeSettings>): Promise<void> {
    streamDeck.logger.info(
      `Set volume for channel: ${ev.payload.settings.selectedChannel}`,
    );
    const channel = ev.payload.settings.selectedChannel;
    const response = await this.sonarInstance.getVolumeData();

    let volume = getVolumeOfChannel(channel, response);

    const newVolume = normalizeVolume(
      volume,
      ev.payload.settings.stepSize,
      ev.payload.settings.increment,
    );

    this.actions.forEach((action) => {
      checkForSetTitle(action, newVolume * 100, this);
    });

    await this.sonarInstance.setVolume(channel, newVolume);
  }
}

async function checkForSetTitle(
  action: KeyAction<SetVolumeSettings> | DialAction<SetVolumeSettings>,
  volume: number,
  currentAction: any,
) {
  const settings = await action.getSettings();
  if (settings.showVolume) {
    await action.setTitle(Math.round(volume).toString() + "%");
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

function normalizeVolume(
  volume: number,
  stepSize: number,
  increment: boolean,
): number {
  let newVolume = volume + stepSize / 100;
  if (!increment) {
    newVolume = volume - stepSize / 100;
  }
  if (newVolume > 1) {
    return 1;
  } else if (newVolume < 0) {
    return 0;
  } else {
    return newVolume;
  }
}

/**
 * Settings for {@link SetVolume}.
 */
type SetVolumeSettings = {
  selectedChannel: string;
  stepSize: number;
  increment: boolean;
  showVolume: boolean;
};
