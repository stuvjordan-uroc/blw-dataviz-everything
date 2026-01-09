import { Point } from "shared-types";

export interface PointLoadedImage {
  image: HTMLImageElement;
  offsetToCenter: {
    x: number,
    y: number
  }
}

export interface PointDisplay {
  key: string; // Stable identifier: "{splitIdx}-{expandedResponseGroupIdx}-{id}"
  point: Point;
  position: {
    x: number,
    y: number
  };
  image: PointLoadedImage | undefined;

  // For appearing/disappearing animations:
  opacity?: number; // 0-1, overall opacity of the point

  // For cross-fade animations only:
  transitioningFromImage?: PointLoadedImage;
  crossFadeProgress?: number; // 0-1, progress of cross-fade (0 = showing fromImage, 1 = showing toImage)
}

export interface VizRenderConfig {
  initialCanvasWidth: number;
  initialDisplayMode: "expanded" | "collapsed";
  initialViewId: string;
  animation?: AnimationConfig | false
}

export interface AnimationConfig {
  /** Duration for points appearing (fade in). Default: 200ms */
  appearDuration?: number;

  /** Duration for points disappearing (fade out). Default: 150ms */
  disappearDuration?: number;

  /** Duration for points moving to new positions. Default: 400ms */
  moveDuration?: number;

  /** Duration for point images changing (cross-fade). Default: matches moveDuration */
  imageChangeDuration?: number;
}