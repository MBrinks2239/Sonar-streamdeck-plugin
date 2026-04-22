import streamDeck, {
  action,
  KeyDownEvent,
  SingletonAction,
} from "@elgato/streamdeck";
import SonarStreamer from "../../managers/streamer-sonar";
import { Channel } from "../../types/channels";
import { StreamRedirectionId } from "../../types/stream-redirection";

@action({ UUID: "com.stellar.steelseries-sonar-controls.streamer.mute-channel" })
export class StreamerMuteChannel extends SingletonAction<StreamerMuteChannelSettings> {
  private readonly sonarInstance = new SonarStreamer();

  override async onKeyDown(
    ev: KeyDownEvent<StreamerMuteChannelSettings>,
  ): Promise<void> {
    const slider = ev.payload.settings.selectedSlider || StreamRedirectionId.Streaming;
    const channel = ev.payload.settings.selectedChannel || Channel.Master;

    streamDeck.logger.info(`Toggling mute on streamer ${slider}/${channel}`);
    try {
      await this.sonarInstance.toggleMuteChannel(slider, channel);
    } catch (err) {
      streamDeck.logger.error(`Streamer mute-channel failed: ${err}`);
    }
  }
}

type StreamerMuteChannelSettings = {
  selectedSlider: StreamRedirectionId;
  selectedChannel: Channel;
};
