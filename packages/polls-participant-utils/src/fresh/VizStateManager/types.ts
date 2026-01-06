import { SplitWithSegmentGroup, VisualizationData } from "shared-types";
import { PointLoadedImage, PointDisplay } from "../types";


export interface VizLogicalState {
  serverState: SplitWithSegmentGroup[];
  serverSequenceNumber: number;
  displayMode: "expanded" | "collapsed";
  viewId: string;
  targetVisibleState: Map<string, PointDisplay>;
}

export interface VizData extends VisualizationData {
  loadedImages: Map<string, PointLoadedImage>
}

export interface CanvasData {
  element: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  pixelWidth: number;
  pixelHeight: number;
}