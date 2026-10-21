import { action } from "@elgato/streamdeck";
import SonarClassic from "../../managers/classic-sonar";
import { Channel, enumKeyFromValue } from "../../types/channels";
import { VolumeDialBase, VolumeDialSettings, VolumeLookup } from "../volume-dial-base";

@action({ UUID: "com.stellar.steelseries-sonar-controls.classic.volume-dial" })
export class SetVolumeDial extends VolumeDialBase<SetVolumeDialSettings> {
  private readonly sonarInstance = new SonarClassic();
  protected readonly label = "Classic volume-dial";
  protected readonly wrongModeText = "Classic only";

  protected withDefaults(settings: Partial<SetVolumeDialSettings>): SetVolumeDialSettings {
    return {
      ...settings,
      selectedChannel: settings.selectedChannel || Channel.Master,
      stepSize: settings.stepSize || 5,
    };
  }

  protected getTitle(settings: SetVolumeDialSettings): string {
    return enumKeyFromValue(Channel, settings.selectedChannel) ?? settings.selectedChannel;
  }

  protected isActiveMode(): Promise<boolean> {
    return this.sonarInstance.isClassicMode();
  }

  protected async loadVolumes(): Promise<VolumeLookup<SetVolumeDialSettings>> {
    const volumes = await this.sonarInstance.getVolumes();
    return (settings) => volumes[settings.selectedChannel];
  }

  protected setVolume(settings: SetVolumeDialSettings, volume: number): Promise<boolean> {
    return this.sonarInstance.setVolume(settings.selectedChannel, volume);
  }

  protected setMute(settings: SetVolumeDialSettings, muted: boolean): Promise<boolean> {
    return this.sonarInstance.muteChannel(settings.selectedChannel, muted);
  }
}

/**
 * Settings for {@link SetVolumeDial}.
 */
type SetVolumeDialSettings = VolumeDialSettings;
