import React from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import { SceneA, SceneB, SceneC, SceneD, SceneE, SceneF } from "./scenes";
import { PAPER } from "./theme";

/** Beat boundaries in frames (30 fps). Scenes key on the absolute frame. */
export const CUTS = { B: 102, C: 156, D: 210, E: 318, F: 372 };

export const Film: React.FC = () => {
  const frame = useCurrentFrame();
  let scene: React.ReactNode;
  if (frame < CUTS.B) scene = <SceneA />;
  else if (frame < CUTS.C) scene = <SceneB />;
  else if (frame < CUTS.D) scene = <SceneC />;
  else if (frame < CUTS.E) scene = <SceneD />;
  else if (frame < CUTS.F) scene = <SceneE />;
  else scene = <SceneF />;
  return (
    <AbsoluteFill style={{ background: PAPER }}>
      {scene}
      <Audio src={staticFile("audio/music.wav")} volume={0.6} />
      <Audio src={staticFile("audio/sfx.wav")} volume={0.9} />
    </AbsoluteFill>
  );
};
