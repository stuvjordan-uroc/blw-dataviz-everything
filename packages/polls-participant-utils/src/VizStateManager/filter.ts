import { SplitWithSegmentGroup } from 'shared-types';
import { Filter } from './types';

export function filterSplitsInView(allSplitsInView: SplitWithSegmentGroup[], filter: Filter) {
  if (filter.length === 0) {
    return allSplitsInView;
  }
  allSplitsInView.filter((split) => {
    let splitPassesThrough = true;
    for (const group of split.groups) {
      //step through each group
      //if any group is "filtered out"
      //by any filter
      //set splitPassesThrough = false
      //and break
      const groupRejected = filter.some((f) => (
        f.batteryName === group.question.batteryName &&
        f.subBattery === group.question.subBattery &&
        f.varName === group.question.varName &&
        (
          group.responseGroup === null ||
          !f.includedResponseGroups.map((rg) => rg.label).includes(group.responseGroup.label)
        )
      ))
      if (groupRejected) {
        splitPassesThrough = false;
        break;
      }
    }
    return splitPassesThrough
  })
}