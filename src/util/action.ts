import streamDeck from "@elgato/streamdeck";
import { isExpectedSonarError } from "../types/errors";
import { AudioDevice } from "../types/audio-device";

/**
 * Runs an action handler so a failure never crashes the plugin: the error is logged and the
 * key or dial shows the alert triangle instead.
 */
export async function runAction(
  action: { showAlert(): Promise<void> },
  label: string,
  handler: () => Promise<void>,
): Promise<void> {
  try {
    await handler();
  } catch (error) {
    const message = `${label} failed: ${getErrorMessage(error)}`;
    if (isExpectedSonarError(error)) streamDeck.logger.warn(message);
    else streamDeck.logger.error(message);
    await action.showAlert().catch(() => {});
  }
}

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Lists audio devices for a property inspector dropdown. Returns an empty list when Sonar is not
 * available, so the dropdown doesn't hang on "Loading...".
 */
export async function listAudioDevicesForUi(getDevices: () => Promise<AudioDevice[]>): Promise<AudioDevice[]> {
  try {
    return await getDevices();
  } catch (error) {
    streamDeck.logger.warn(`Could not list audio devices: ${getErrorMessage(error)}`);
    return [];
  }
}
