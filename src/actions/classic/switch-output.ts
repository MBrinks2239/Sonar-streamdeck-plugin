import streamDeck, {
  action,
  DidReceiveSettingsEvent,
  KeyDownEvent,
  SendToPluginEvent,
  SingletonAction,
} from "@elgato/streamdeck";
import type {
	JsonValue
} from "@elgato/utils";
import Channel from "../../types/channels";
import { AudioDevice, AudioDeviceType } from "../../types/audio-device";
import SonarClassic from "../../managers/classic-sonar";
import { json } from "node:stream/consumers";

@action({ UUID: "com.stellar.steelseries-sonar-controls.classic.switch-output" })
export class SwitchOutput extends SingletonAction<SwitchOutputSettings> {
  private readonly sonarInstance = new SonarClassic();

  override async onKeyDown(
    ev: KeyDownEvent<SwitchOutputSettings>,
  ): Promise<void> {
    let channel = ev.payload.settings.channelToChange || Channel.Master;
    const output = JSON.parse(ev.payload.settings.audioDeviceJson) as AudioDevice;
    await this.sonarInstance.switchDevice(channel, output);
  }

  override onDidReceiveSettings(ev: DidReceiveSettingsEvent<SwitchOutputSettings>): Promise<void> | void {
    if (!ev.payload.settings.wasUi) return;
    const outputDevice = JSON.parse(ev.payload.settings.audioDeviceJson) as AudioDevice;
    const newSettings = {
      ...ev.payload.settings,
      outputToChangeTo: JSON.stringify(outputDevice),
      wasUi: false,
    }
    ev.action.setSettings(newSettings);
  }

  override async onSendToPlugin(
    ev: SendToPluginEvent<JsonValue, SwitchOutputSettings>,
  ): Promise<void> {
    const outputs = await this.sonarInstance.getAudioDevices();
    const options = outputs
      .filter((output) => output.type == AudioDeviceType.Output)
      .map((output) => ({ label: output.name, value: JSON.stringify(output) }));

    streamDeck.ui.sendToPropertyInspector({
      event: "getOutputs",
      items: options,
    });
  }
}

/**
 * Settings for {@link SwitchOutput}.
 */
type SwitchOutputSettings = {
  channelToChange: Channel;
  audioDeviceJson: string;
  wasUi: boolean;
};
