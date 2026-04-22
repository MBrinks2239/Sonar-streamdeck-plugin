import streamDeck, {
  action,
  KeyDownEvent,
  SendToPluginEvent,
  SingletonAction,
} from "@elgato/streamdeck";
import type {
	JsonValue
} from "@elgato/utils";
import sonar from "../../managers/legacy/sonar-controller";

@action({ UUID: "com.stellar.steelseries-sonar-controls.switch-input" })
export class SwitchInput extends SingletonAction<SwitchInputSettings> {
  private readonly sonarInstance = new sonar();

  override async onKeyDown(
    ev: KeyDownEvent<SwitchInputSettings>,
  ): Promise<void> {
    const input = ev.payload.settings.inputToChangeTo;
    await this.sonarInstance.switchOutput("mic", input);
  }

  override async onSendToPlugin(
    ev: SendToPluginEvent<JsonValue, SwitchInputSettings>,
  ): Promise<void> {
    const inputs = await this.sonarInstance.getAudioDevices();
    const options = inputs
      .filter((input) => input.dataFlow == "capture" && input.role == "none")
      .map((input) => ({ label: input.friendlyName, value: input.id }));

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
