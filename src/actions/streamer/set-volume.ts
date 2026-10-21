import streamDeck, {
  action,
  Action,
  KeyDownEvent,
  SingletonAction,
  WillAppearEvent,
} from "@elgato/streamdeck";
import SonarStreamer from "../../managers/streamer-sonar";
import { Channel } from "../../types/channels";
import { StreamRedirectionId } from "../../types/stream-redirection";
import { clamp } from "../../util/util";
import { runAction } from "../../util/action";

@action({ UUID: "com.stellar.steelseries-sonar-controls.streamer.set-volume" })
export class StreamerSetVolume extends SingletonAction<StreamerSetVolumeSettings> {
  private readonly sonarInstance = new SonarStreamer();

  override async onWillAppear(ev: WillAppearEvent<StreamerSetVolumeSettings>): Promise<void> {
    // An untouched checkbox is undefined. Store the default, so the checkbox and the key agree.
    if (ev.payload.settings.increment === undefined) {
      await ev.action.setSettings({ ...ev.payload.settings, increment: true });
    }
  }

  override async onKeyDown(
    ev: KeyDownEvent<StreamerSetVolumeSettings>,
  ): Promise<void> {
    const slider = ev.payload.settings.selectedSlider || StreamRedirectionId.Streaming;
    const channel = ev.payload.settings.selectedChannel || Channel.Master;
    const stepSize = Number(ev.payload.settings.stepSize) || 5;
    const increment = ev.payload.settings.increment ?? true;

    streamDeck.logger.info(
      `Streamer set-volume: slider=${slider} channel=${channel} step=${stepSize} increment=${increment}`,
    );

    await runAction(ev.action, "Streamer set-volume", async () => {
      const current = await this.sonarInstance.getVolume(slider, channel);
      const delta = (increment ? stepSize : -stepSize) / 100;
      const newVolume = clamp(current.volume + delta, 0, 1);

      await this.sonarInstance.setVolume(slider, channel, newVolume);
      streamDeck.logger.info(`Streamer set-volume result: ${current.volume} -> ${newVolume}`);

      for (const action of this.actions) {
        await checkForSetTitle(action, slider, channel, newVolume * 100);
      }
    });
  }
}

/** Shows the new volume on every key that has "Show volume as title" on for the same slider and channel. */
async function checkForSetTitle(
  action: Action<StreamerSetVolumeSettings>,
  slider: StreamRedirectionId,
  channel: Channel,
  volume: number,
) {
  const settings = await action.getSettings();
  const sameTarget =
    (settings.selectedSlider || StreamRedirectionId.Streaming) === slider &&
    (settings.selectedChannel || Channel.Master) === channel;
  if (settings.showVolume && sameTarget && action.isKey()) {
    await action.setTitle(`${Math.round(volume)}%`);
  }
}

type StreamerSetVolumeSettings = {
  selectedSlider: StreamRedirectionId;
  selectedChannel: Channel;
  stepSize: number | string;
  increment: boolean;
  showVolume: boolean;
};
