import React from "react";
import { Composition } from "remotion";
import { MacDemo } from "./MacDemo";

const CAPTURE_SECONDS = 103.52;

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="TracyMac"
      component={MacDemo}
      durationInFrames={Math.round(CAPTURE_SECONDS * 30)}
      fps={30}
      width={1920}
      height={1080}
    />
  );
};
