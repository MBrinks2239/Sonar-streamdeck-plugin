import streamDeck, {
  action,
  KeyDownEvent,
  SendToPluginEvent,
  SingletonAction,
} from "@elgato/streamdeck";
import type {
	JsonValue
} from "@elgato/utils";
import SonarClassic from "../../managers/classic-sonar";
import SonarStreamer from "../../managers/streamer-sonar";
import { Channel } from "../../types/channels";
import { AudioDeviceType, parseSavedAudioDevice } from "../../types/audio-device";
import { listAudioDevicesForUi, runAction } from "../../util/action";

/** Works in both modes, so it is not limited to Classic despite living here. */
@action({ UUID: "com.stellar.steelseries-sonar-controls.switch-input" })
export class SwitchInput extends SingletonAction<SwitchInputSettings> {
  private readonly classicInstance = new SonarClassic();
  private readonly streamerInstance = new SonarStreamer();

  override async onKeyDown(
    ev: KeyDownEvent<SwitchInputSettings>,
  ): Promise<void> {
    await runAction(ev.action, "Switch input", async () => {
      const input = parseSavedAudioDevice(ev.payload.settings.inputToChangeTo);
      if (!input) throw new Error("No input device selected");
      // In Streamer mode the classic mic redirection is accepted but has no effect.
      if (await this.streamerInstance.isStreamerMode()) {
        await this.streamerInstance.switchMicInput(input);
      } else {
        await this.classicInstance.switchDevice(Channel.Mic, input);
      }
    });
  }

  override async onSendToPlugin(
    ev: SendToPluginEvent<JsonValue, SwitchInputSettings>,
  ): Promise<void> {
    const inputs = await listAudioDevicesForUi(() => this.classicInstance.getAudioDevices());
    const options = inputs
      .filter((input) => input.type === AudioDeviceType.Input)
      .map((input) => ({ label: input.name, value: input.id }));

    streamDeck.ui.sendToPropertyInspector({
      event: "getInputs",
      items: options,
    });
  }
}

/**
 * Settings for {@link SwitchInput}.
 */
type SwitchInputSettings = {
  channelToChange: string;
  inputToChangeTo: string;
};
