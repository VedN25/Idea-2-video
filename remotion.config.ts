import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("png");
Config.setOverwriteOutput(true);
Config.setChromiumOpenGlRenderer("swiftshader");
Config.setChromiumDisableWebSecurity(true);
Config.setChromiumHeadlessMode(true);
Config.setConcurrency(2);
// Config.setTimeout(300000); // 5 minutes - not available in this version

export default Config;
