import { sessionConfig, vizConfig_oneEach, vizConfig_bothHorizontally, vizConfig_bothVertically, vizConfig_noGroupings } from '../fixtures/session_and_viz_configs';
import { SegmentViz } from '../../src/segmentViz/SegmentViz';
import { VizConfigSegments } from '../../src/segmentViz/types';

export type VizName = 'oneEach' | 'bothHorizontal' | 'bothVertical' | 'none';
type SegmentVizInstance = InstanceType<typeof SegmentViz>;

export function makeAllSegmentVizFromFixtures(
  respondentsData: any
): Array<{ name: VizName; instance: SegmentVizInstance, config: VizConfigSegments }> {
  const configs: { name: VizName; cfg: any }[] = [
    { name: 'oneEach', cfg: vizConfig_oneEach },
    { name: 'bothHorizontal', cfg: vizConfig_bothHorizontally },
    { name: 'bothVertical', cfg: vizConfig_bothVertically },
    { name: 'none', cfg: vizConfig_noGroupings }
  ];

  return configs.map(c => ({
    name: c.name,
    instance: new SegmentViz(sessionConfig as any, c.cfg as any, respondentsData) as SegmentVizInstance,
    config: c.cfg
  }));
}
