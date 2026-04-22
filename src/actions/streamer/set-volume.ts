import streamDeck, {
  action,
  DialAction,
  KeyAction,
  KeyDownEvent,
  SingletonAction,
} from "@elgato/streamdeck";
import SonarStreamer from "../../managers/streamer-sonar";
import { Channel } from "../../types/channels";
import { StreamRedirectionId } from "../../types/stream-redirection";
import { clamp } from "../../util/util";

@action({ UUID: "com.stellar.steelseries-sonar-controls.streamer.set-volume" })
export class StreamerSetVolume extends SingletonAction<StreamerSetVolumeSettings> {
  private readonly sonarInstance = new SonarStreamer();

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

    try {
      const current = await this.sonarInstance.getVolume(slider, channel);
      const delta = (increment ? stepSize : -stepSize) / 100;
      const newVolume = clamp(current.volume + delta, 0, 1);

      this.actions.forEach((action) => {
        checkForSetTitle(action, newVolume * 100);
      });

      const ok = await this.sonarInstance.setVolume(slider, channel, newVolume);
      streamDeck.logger.info(
        `Streamer set-volume result: ${current.volume} -> ${newVolume} (ok=${ok})`,
      );
    } catch (err) {
      streamDeck.logger.error(`Streamer set-volume failed: ${err}`);
    }
  }
}

async function checkForSetTitle(
  action: KeyAction<StreamerSetVolumeSettings> | DialAction<StreamerSetVolumeSettings>,
  volume: number,
) {
  const settings = await action.getSettings();
  if (settings.showVolume) {
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
