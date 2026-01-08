import { Question, ResponseGroup, ResponseGroupWithStatsAndSegment, SplitWithSegmentGroup, VisualizationData } from "shared-types";
import { PointLoadedImage, PointDisplay } from "../types";

/**
 * Type of state change that triggered a subscriber notification
 */
export type StateChangeOrigin = "viewId" | "displayMode" | "server" | "canvas" | "subscription";


export type SegmentGroupDisplay = Omit<SplitWithSegmentGroup, "points" | "responseGroups"> & {
  responseGroups: (Omit<ResponseGroupWithStatsAndSegment, "pointPositions" | "pointImage">)[]
}

export type Filter = Array<Question & { includedResponseGroups: ResponseGroup[] }>

export interface VizLogicalState {
  //client-selected displayMode
  displayMode: "expanded" | "collapsed";
  //client-selected viewId
  viewId: string;
  //boundaries and positions of segment groups and segments in the current state, coordinates and length scaled to canvas dimensions
  filter: Filter;
  //splits filtered by viewId and filter
  filteredSplits: SplitWithSegmentGroup[];
  segmentDisplay: SegmentGroupDisplay[];
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
}