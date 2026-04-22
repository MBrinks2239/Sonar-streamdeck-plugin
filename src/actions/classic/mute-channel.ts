import streamDeck, {
  action,
  KeyDownEvent,
  SingletonAction,
} from "@elgato/streamdeck";
import sonar from "../../managers/legacy/sonar-controller";

@action({ UUID: "com.stellar.steelseries-sonar-controls.mute-channel" })
export class MuteChannel extends SingletonAction<MuteChannelSettings> {
  private readonly sonarInstance = new sonar();

  override async onKeyDown(
    ev: KeyDownEvent<MuteChannelSettings>,
  ): Promise<void> {
    streamDeck.logger.info(
      `Muting channel ${ev.payload.settings.selectedChannel}`,
    );
    const channel = ev.payload.settings.selectedChannel;
    const response = await this.sonarInstance.getChannelMuteData(channel);
    await this.sonarInstance.muteChannel(channel, !response);
  }
}

/**
 * Settings for {@link MuteChannel}.
 */
type MuteChannelSettings = {
  selectedChannel: string;
};
