import { Point, SplitWithSegmentGroup, VisualizationData } from "shared-types";
import { PointLoadedImage } from "../types";


export interface PointDisplay {
  point: Point;
  position: {
    x: number,
    y: number
  };
  image: PointLoadedImage;
}

export interface VizLogicalState {
  serverState: SplitWithSegmentGroup[];
  displayMode: "expanded" | "collapsed";
  viewId: string;
  canvasWidth: number;
  canvasHeight: number;
  targetVisibleState: PointDisplay[];
}

export interface VizData extends VisualizationData {
  loadedImages: Map<string, PointLoadedImage>
}