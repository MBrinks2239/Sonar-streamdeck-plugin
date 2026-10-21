import streamDeck, {
  action,
  Action,
  KeyDownEvent,
  SingletonAction,
  WillAppearEvent,
} from "@elgato/streamdeck";
import SonarClassic from "../../managers/classic-sonar";
import { Channel } from "../../types/channels";
import { clamp } from "../../util/util";
import { runAction } from "../../util/action";

@action({ UUID: "com.stellar.steelseries-sonar-controls.set-volume" })
export class SetVolume extends SingletonAction<SetVolumeSettings> {
  private readonly sonarInstance = new SonarClassic();

  override async onWillAppear(ev: WillAppearEvent<SetVolumeSettings>): Promise<void> {
    // An untouched checkbox is undefined. Store the default, so the checkbox and the key agree.
    if (ev.payload.settings.increment === undefined) {
      await ev.action.setSettings({ ...ev.payload.settings, increment: true });
    }
  }

  override async onKeyDown(ev: KeyDownEvent<SetVolumeSettings>): Promise<void> {
    const channel = ev.payload.settings.selectedChannel || Channel.Master;
    streamDeck.logger.info(`Set volume for channel: ${channel}`);

    await runAction(ev.action, "Classic set-volume", async () => {
      const current = await this.sonarInstance.getVolume(channel);
      const stepSize = Number(ev.payload.settings.stepSize) || 5;
      const increment = ev.payload.settings.increment ?? true;
      const newVolume = clamp(current.volume + (increment ? stepSize : -stepSize) / 100, 0, 1);

      await this.sonarInstance.setVolume(channel, newVolume);

      for (const action of this.actions) {
        await checkForSetTitle(action, channel, newVolume * 100);
      }
    });
  }
}

/** Shows the new volume on every key that has "Show volume as title" on for the same channel. */
async function checkForSetTitle(
  action: Action<SetVolumeSettings>,
  channel: Channel,
  volume: number,
) {
  const settings = await action.getSettings();
  if (settings.showVolume && (settings.selectedChannel || Channel.Master) === channel && action.isKey()) {
    await action.setTitle(Math.round(volume).toString() + "%");
  }
}

/**
 * Settings for {@link SetVolume}.
 */
type SetVolumeSettings = {
  selectedChannel: Channel;
  stepSize: number | string;
  increment: boolean;
  showVolume: boolean;
};
