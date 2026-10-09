import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { CloseScene, GapsScene, KnowledgeScene, MapScene, OverviewScene, ParseScene, PeopleScene, StructureScene, TitleScene, UploadScene } from "./scenes";
import { color } from "./theme";

const fps = 30;
const at = (seconds: number) => Math.round(seconds * fps);

export const Demo: React.FC = () => {
  const scenes: Array<[number, number, React.FC]> = [
    [0, 5, TitleScene],
    [5, 11, UploadScene],
    [16, 12, ParseScene],
    [28, 10, OverviewScene],
    [38, 9, MapScene],
    [47, 9, StructureScene],
    [56, 10, PeopleScene],
    [66, 8, KnowledgeScene],
    [74, 10, GapsScene],
    [84, 6, CloseScene],
  ];
  return (
    <AbsoluteFill style={{ background: color.bg }}>
      {scenes.map(([start, length, Scene], i) => (
        <Sequence key={i} from={at(start)} durationInFrames={at(length)}>
          <Scene />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
