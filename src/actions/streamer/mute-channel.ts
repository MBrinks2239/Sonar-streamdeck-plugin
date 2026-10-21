import streamDeck, {
  action,
  DidReceiveSettingsEvent,
  KeyAction,
  KeyDownEvent,
  SingletonAction,
  WillAppearEvent,
} from "@elgato/streamdeck";
import SonarStreamer from "../../managers/streamer-sonar";
import { Channel } from "../../types/channels";
import { StreamRedirectionId } from "../../types/stream-redirection";
import { runAction } from "../../util/action";

const MUTED_STATE = 1;

@action({ UUID: "com.stellar.steelseries-sonar-controls.streamer.mute-channel" })
export class StreamerMuteChannel extends SingletonAction<StreamerMuteChannelSettings> {
  private readonly sonarInstance = new SonarStreamer();

  override async onWillAppear(ev: WillAppearEvent<StreamerMuteChannelSettings>): Promise<void> {
    if (ev.action.isKey()) await this.showMuteState(ev.action, ev.payload.settings);
  }

  override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<StreamerMuteChannelSettings>): Promise<void> {
    if (ev.action.isKey()) await this.showMuteState(ev.action, ev.payload.settings);
  }

  override async onKeyDown(
    ev: KeyDownEvent<StreamerMuteChannelSettings>,
  ): Promise<void> {
    const slider = ev.payload.settings.selectedSlider || StreamRedirectionId.Streaming;
    const channel = ev.payload.settings.selectedChannel || Channel.Master;

    streamDeck.logger.info(`Toggling mute on streamer ${slider}/${channel}`);
    await runAction(ev.action, "Streamer mute-channel", async () => {
      const muted = !(await this.sonarInstance.getVolume(slider, channel)).muted;
      await this.sonarInstance.muteChannel(slider, channel, muted);
      await ev.action.setState(muted ? MUTED_STATE : 0);
    });
  }

  /** Best effort: show Sonar's mute state on the key; it updates on the next press if Sonar is off. */
  private async showMuteState(
    key: KeyAction<StreamerMuteChannelSettings>,
    settings: StreamerMuteChannelSettings,
  ): Promise<void> {
    try {
      if (!(await this.sonarInstance.isStreamerMode())) return;
      const { muted } = await this.sonarInstance.getVolume(
        settings.selectedSlider || StreamRedirectionId.Streaming,
        settings.selectedChannel || Channel.Master,
      );
      await key.setState(muted ? MUTED_STATE : 0);
    } catch {
      // Sonar is not available.
    }
  }
}

type StreamerMuteChannelSettings = {
  selectedSlider: StreamRedirectionId;
  selectedChannel: Channel;
};
