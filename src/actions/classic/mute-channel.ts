import streamDeck, {
  action,
  DidReceiveSettingsEvent,
  KeyAction,
  KeyDownEvent,
  SingletonAction,
  WillAppearEvent,
} from "@elgato/streamdeck";
import SonarClassic from "../../managers/classic-sonar";
import { Channel } from "../../types/channels";
import { runAction } from "../../util/action";

const MUTED_STATE = 1;

@action({ UUID: "com.stellar.steelseries-sonar-controls.mute-channel" })
export class MuteChannel extends SingletonAction<MuteChannelSettings> {
  private readonly sonarInstance = new SonarClassic();

  override async onWillAppear(ev: WillAppearEvent<MuteChannelSettings>): Promise<void> {
    if (ev.action.isKey()) await this.showMuteState(ev.action, ev.payload.settings);
  }

  override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<MuteChannelSettings>): Promise<void> {
    if (ev.action.isKey()) await this.showMuteState(ev.action, ev.payload.settings);
  }

  override async onKeyDown(
    ev: KeyDownEvent<MuteChannelSettings>,
  ): Promise<void> {
    await runAction(ev.action, "Classic mute-channel", async () => {
      const channel = ev.payload.settings.selectedChannel || Channel.Master;
      streamDeck.logger.info(`Muting channel ${channel}`);
      const muted = !(await this.sonarInstance.getVolume(channel)).muted;
      await this.sonarInstance.muteChannel(channel, muted);
      await ev.action.setState(muted ? MUTED_STATE : 0);
    });
  }

  /** Best effort: show Sonar's mute state on the key; it updates on the next press if Sonar is off. */
  private async showMuteState(key: KeyAction<MuteChannelSettings>, settings: MuteChannelSettings): Promise<void> {
    try {
      if (!(await this.sonarInstance.isClassicMode())) return;
      const { muted } = await this.sonarInstance.getVolume(settings.selectedChannel || Channel.Master);
      await key.setState(muted ? MUTED_STATE : 0);
    } catch {
      // Sonar is not available.
    }
  }
}

/**
 * Settings for {@link MuteChannel}.
 */
type MuteChannelSettings = {
  selectedChannel: Channel;
};
