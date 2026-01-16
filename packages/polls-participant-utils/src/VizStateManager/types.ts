import { GridLabelsDisplay, ResponseGroupWithStatsAndSegment, SplitWithSegmentGroup, VisualizationData } from "shared-types";
import { PointLoadedImage, PointDisplay } from "../types";

/**
 * Type of state change that triggered a subscriber notification
 */
export type StateChangeOrigin = "viewId" | "displayMode" | "server" | "canvas" | "subscription";


export type SegmentGroupDisplay = Omit<SplitWithSegmentGroup, "points" | "responseGroups"> & {
  responseGroups: (Omit<ResponseGroupWithStatsAndSegment, "pointPositions" | "pointImage">)[]
}



export interface VizLogicalState {
  //client-selected displayMode
  displayMode: "expanded" | "collapsed";
  //client-selected viewId
  viewId: string;
  //boundaries and positions of segment groups and segments in the current state, coordinates and length scaled to canvas dimensions
  segmentDisplay: SegmentGroupDisplay[];
  //grid labels with positions and dimensions for the current view, scaled to canvas dimensions
  gridLabelsDisplay: GridLabelsDisplay;
  //images and positions for points displayed at the current state, with point coordinates and image offsets scaled to canvas dimensions
  //tracked separately as a "target" to allow animated transitions of point images and positions when state mutates. 
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
  margin: {
    x: number;
    y: number;
  };
}