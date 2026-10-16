import React from "react";
import { Composition } from "remotion";
import { Film } from "./Film";
import { DURATION, FPS, H, W } from "./theme";
import { loadFont } from "./font";

loadFont();

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="BrandiLaunch"
      component={Film}
      durationInFrames={DURATION}
      fps={FPS}
      width={W}
      height={H}
    />
  );
};
