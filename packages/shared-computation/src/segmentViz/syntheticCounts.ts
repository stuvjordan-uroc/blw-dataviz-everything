import type { ResponseGroupWithStats } from "../statistics/types";
export interface GetSyntheticCountsProps {
  responseGroups: ResponseGroupWithStats[];
  syntheticSampleSize: number;
}
export function getSyntheticCounts({
  responseGroups,
  syntheticSampleSize
}: GetSyntheticCountsProps): number[] {
  const counts = responseGroups.map((rg) => {
    const float = rg.proportion * syntheticSampleSize;
    return ({
      float: float,
      whole: Math.floor(float)
    })
  })
  function sumCounts(counts: { float: number, whole: number }[]): number {
    return counts
      .map(count => count.whole)
      .reduce((acc, curr) => acc + curr, 0)
  }
  while (sumCounts(counts) < syntheticSampleSize) {
    const mostOff = counts.reduce(
      (acc, curr) => (acc.float - acc.whole) > (curr.float - curr.whole) ? acc : curr,
      counts[0]
    )
    mostOff.whole++;
  }
  return counts.map(count => count.whole);
}
