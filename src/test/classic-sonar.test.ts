import SonarClassic from "../managers/classic-sonar";
import Channel from "../types/channels";

test("Test getVolumes", async () => {
   const sonar = new SonarClassic();
   await sonar.waitForInitialization();
   const volumes = await sonar.getVolumes();
   expect(volumes).toBeDefined();
   expect(volumes).toHaveProperty("master");
   expect(volumes).toHaveProperty("game");
   expect(volumes).toHaveProperty("chatRender");
   expect(volumes).toHaveProperty("media");
   expect(volumes).toHaveProperty("aux");
   expect(volumes).toHaveProperty("chatCapture");
});

test("Test getVolume for master channel", async () => {
   const sonar = new SonarClassic();
   await sonar.waitForInitialization();
   const volume = await sonar.getVolume(Channel.Master);
   expect(volume).toBeDefined();
   expect(volume).toHaveProperty("volume");
   expect(volume).toHaveProperty("muted");
});

test("Mute chanel", async () => {
   const sonar = new SonarClassic();
   await sonar.waitForInitialization();
   await sonar.muteChannel(Channel.Game, true);
   let volume = await sonar.getVolume(Channel.Game);
   expect(volume.muted).toBe(true);
});