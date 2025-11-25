import fs from 'fs';
import path from 'path';
import { parseSurveyCsvToRespondents } from './helpers/parseRespondents';
import { makeAllSegmentVizFromFixtures } from './helpers/createAllSegmentViz';
import { getQuestionKey } from '../src/utils';
import {
  vizConfig_oneEach,
  vizConfig_bothHorizontally,
  vizConfig_bothVertically,
  vizConfig_noGroupings
} from './fixtures/session_and_viz_configs';


type Row = {
  id: string | number;
  // in the coded fixture moods/gender/height are numeric codes, but NULL and SKIPPED remain strings
  mood: number | 'NULL' | 'SKIPPED' | string;
  gender: number | 'NULL' | 'SKIPPED' | string;
  height: number | 'NULL' | 'SKIPPED' | string;
};

function loadCsvIgnoringComments(filePath: string): Row[] {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  const dataLines = lines.filter(l => l.trim().length > 0 && !l.trim().startsWith('#'));
  const header = dataLines.shift();
  if (!header) return [];
  const headerCols = header.split(',').map(h => h.trim());
  return dataLines.map(line => {
    const cols = line.split(',');
    const obj: any = {};
    headerCols.forEach((h, i) => {
      const raw = cols[i] ? cols[i].trim() : '';
      if (/^\d+$/.test(raw)) {
        obj[h] = Number(raw);
      } else {
        obj[h] = raw;
      }
    });
    return obj as Row;
  });
}

describe('survey_responses.csv fixture', () => {
  const fixturePath = path.join(__dirname, 'fixtures', 'survey_responses.csv');
  let rows: Row[];

  beforeAll(() => {
    rows = loadCsvIgnoringComments(fixturePath);
  });

  test('has 26 rows total (including NULL/SKIPPED incomplete responses)', () => {
    expect(rows.length).toBe(26);
  });

  // Helper to filter only complete rows (no NULL or SKIPPED in any field)
  function completeRows(input: Row[]) {
    return input.filter(r => {
      return (
        typeof r.mood === 'number' &&
        typeof r.gender === 'number' &&
        typeof r.height === 'number'
      );
    });
  }

  test('overall mood counts match expected totals (excluding incomplete responses)', () => {
    const complete = completeRows(rows);
    expect(complete.length).toBe(20);

    const counts = complete.reduce<Record<number | string, number>>((acc, r) => {
      const key = r.mood as number | string;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<number | string, number>);

    expect(counts[0]).toBe(2); // very sad
    expect(counts[1]).toBe(4); // sad
    expect(counts[2]).toBe(8); // happy
    expect(counts[3]).toBe(6); // very happy
  });

  test('grouped by gender+height have expected breakdowns', () => {
    const complete = completeRows(rows);
    const groups: Record<string, { [k: number]: number; total: number }> = {};
    complete.forEach(r => {
      const key = `${r.gender}|${r.height}`;
      groups[key] = groups[key] || ({ 0: 0, 1: 0, 2: 0, 3: 0, total: 0 } as any);
      const moodKey = r.mood as number;
      groups[key][moodKey] = (groups[key][moodKey] || 0) + 1;
      groups[key].total++;
    });

    expect(groups['0|0'].total).toBe(5);
    expect(groups['0|0'][0]).toBe(1);
    expect(groups['0|0'][1]).toBe(1);
    expect(groups['0|0'][2]).toBe(2);
    expect(groups['0|0'][3]).toBe(1);

    expect(groups['0|1'].total).toBe(5);
    expect(groups['0|1'][0]).toBe(0);
    expect(groups['0|1'][1]).toBe(1);
    expect(groups['0|1'][2]).toBe(3);
    expect(groups['0|1'][3]).toBe(1);

    expect(groups['1|0'].total).toBe(5);
    expect(groups['1|0'][0]).toBe(1);
    expect(groups['1|0'][1]).toBe(1);
    expect(groups['1|0'][2]).toBe(2);
    expect(groups['1|0'][3]).toBe(1);

    expect(groups['1|1'].total).toBe(5);
    expect(groups['1|1'][0]).toBe(0);
    expect(groups['1|1'][1]).toBe(1);
    expect(groups['1|1'][2]).toBe(1);
    expect(groups['1|1'][3]).toBe(3);
  });

  test('grouped by height only produce expected tall/short distributions', () => {
    const complete = completeRows(rows);
    const byHeight = complete.reduce<Record<number | string, { [k: number]: number }>>((acc, r) => {
      const h = r.height as number | string;
      acc[h] = acc[h] || ({ 0: 0, 1: 0, 2: 0, 3: 0 } as any);
      const moodKey = r.mood as number;
      acc[h][moodKey] = (acc[h][moodKey] || 0) + 1;
      return acc;
    }, {} as any);

    expect(byHeight[0][0]).toBe(2);
    expect(byHeight[0][1]).toBe(2);
    expect(byHeight[0][2]).toBe(4);
    expect(byHeight[0][3]).toBe(2);

    expect(byHeight[1][0]).toBe(0);
    expect(byHeight[1][1]).toBe(2);
    expect(byHeight[1][2]).toBe(4);
    expect(byHeight[1][3]).toBe(4);
  });

  test('grouped by gender only produce expected male/female distributions', () => {
    const complete = completeRows(rows);
    const byGender = complete.reduce<Record<number | string, { [k: number]: number }>>((acc, r) => {
      const g = r.gender as number | string;
      acc[g] = acc[g] || ({ 0: 0, 1: 0, 2: 0, 3: 0 } as any);
      const moodKey = r.mood as number;
      acc[g][moodKey] = (acc[g][moodKey] || 0) + 1;
      return acc;
    }, {} as any);

    expect(byGender[0][0]).toBe(1);
    expect(byGender[0][1]).toBe(2);
    expect(byGender[0][2]).toBe(5);
    expect(byGender[0][3]).toBe(2);

    expect(byGender[1][0]).toBe(1);
    expect(byGender[1][1]).toBe(2);
    expect(byGender[1][2]).toBe(3);
    expect(byGender[1][3]).toBe(4);
  });
});

const fixturePath = path.join(__dirname, 'fixtures', 'survey_responses.csv');
const respondentsData = parseSurveyCsvToRespondents(fixturePath);

describe("Respondent data fixture", () => {
  test('parseSurveyCsvToRespondents produces RespondentData entries with NULL->null and SKIPPED->omitted', () => {
    // fixture has 26 respondent rows
    expect(respondentsData.length).toBe(26);
    // find respondent 21 which had mood=NULL (we expect a response entry for mood with response: null)
    const r21 = respondentsData.find(r => r.respondentId === 21);
    expect(r21).toBeDefined();
    expect(r21!.responses.some(resp => resp.varName === 'mood' && resp.response === null)).toBe(true);
    // find respondent 22 which had mood=SKIPPED (no mood response)
    const r22 = respondentsData.find(r => r.respondentId === 22);
    expect(r22).toBeDefined();
    expect(r22!.responses.some(resp => resp.varName === 'mood')).toBe(false);
  });
})

const allSegmentViz = makeAllSegmentVizFromFixtures(respondentsData);

describe("SegmentViz bounding box", () => {

  test("getBoundingBox - default (one each)", () => {


    // testing layout for default config (oneEach)
    const oneEachViz = allSegmentViz.find((c) => c.name === ('oneEach' as any));
    expect(oneEachViz).toBeDefined();
    const oneEachBb = oneEachViz!.instance.getBoundingBox();
    /**
     * HORIZONTAL LAYOUT
     *
     * In each segment group, there are 4 expanded segments,
     * and thus 3 response gaps.  vizConfig used by the helper 
     * above sets response
     * gaps to 5.  So total width of response gaps in expanded
     * view within a segment group is 15.
     * minGroupAvailableWidth is set to 100.
     * So in the view in which all horizontal groups are 
     * active, each segment group is 115 units wide.
     * There are two segment groups on the horizontal axis
     * in the view with all horizontal groups active,
     * so that 2 X 115 = 230 units.  Then we have the groupGapHorizontal
     * which the config sets to 10.  So the vizWidth should be 230 + 10 = 240.
     * 
     * VERTICAL LAYOUT
     * 
     * Config sets groupGapVertical to 10.  There are two 
     * segment groups laid out vertically in the view with
     * all vertical groups active, so 1 vertical group gap of 10 units.
     * minGroupHeight in the config is set to 30.
     * So total vizHeight is:
     * 2 X 30 + 10 = 70. 
     */
    expect(oneEachBb).toEqual({ width: 240, height: 70 });
  });

  test('getBoundingBox - bothHorizontal', () => {
    const allSegmentViz = makeAllSegmentVizFromFixtures(respondentsData);
    // testing layout for bothHorizontal
    const bothHViz = allSegmentViz.find((c) => c.name === ('bothHorizontal' as any));
    expect(bothHViz).toBeDefined();
    const bothHBb = bothHViz!.instance.getBoundingBox();
    /**
     * HORIZONTAL LAYOUT
     *
     * In each segment group, there are 4 expanded segments,
     * and thus 3 response gaps.  vizConfig used by the helper 
     * above sets response
     * gaps to 5.  So total width of response gaps in expanded
     * view within a segment group is 15.
     * minGroupAvailableWidth is set to 100.
     * So in the view in which all horizontal groups are 
     * active, each segment group is 115 units wide.
     * There are FOUR segment groups on the horizontal axis
     * in the view with all horizontal groups active,
     * so that 4 X 115 = 460 units.  Then we have the groupGapHorizontal
     * which the config sets to 10.  And there are 4 horizontal groups.
     * So the vizWidth should be 460 + 10 X 3 = 490.
     * 
     * VERTICAL LAYOUT
     * 
     * Config sets groupGapVertical to 10.  There is 1
     * segment group laid out vertically in the view with
     * all vertical groups active, so 0 vertical group gap of 10 units.
     * minGroupHeight in the config is set to 30.
     * So total vizHeight is:
     * 30. 
     */
    expect(bothHBb).toEqual({ width: 490, height: 30 });
  });

  test('getBoundingBox - bothVertical', () => {
    const allSegmentViz = makeAllSegmentVizFromFixtures(respondentsData);
    // testing layout for bothVertical
    const bothVViz = allSegmentViz.find((c) => c.name === ('bothVertical' as any));
    expect(bothVViz).toBeDefined();
    const bothVBb = bothVViz!.instance.getBoundingBox();
    /**
     * HORIZONTAL LAYOUT
     *
     * In each segment group, there are 4 expanded segments,
     * and thus 3 response gaps.  vizConfig used by the helper 
     * above sets response
     * gaps to 5.  So total width of response gaps in expanded
     * view within a segment group is 15.
     * minGroupAvailableWidth is set to 100.
     * So in the view in which all horizontal groups are 
     * active, each segment group is 115 units wide.
     * There is ONE segment groups on the horizontal axis
     * in the view with all horizontal groups active,
     * so no group gaps.  So vizWidth = 115.
     * 
     * VERTICAL LAYOUT
     * 
     * Config sets groupGapVertical to 10.  There are 4
     * segment group laid out vertically in the view with
     * all vertical groups active, so 3 vertical group gaps of 10 units each
     * totaling 30 units.
     * minGroupHeight in the config is set to 30.
     * So total vizHeight is:
     * 4 x 30 + 30 = 150 
     */
    expect(bothVBb).toEqual({ width: 115, height: 150 });
  });

  test('getBoundingBox - none (no groupings)', () => {
    const allSegmentViz = makeAllSegmentVizFromFixtures(respondentsData);
    // testing layout for no groups
    const noGroupsViz = allSegmentViz.find((c) => c.name === ('none' as any));
    expect(noGroupsViz).toBeDefined();
    const noGroupsBb = noGroupsViz!.instance.getBoundingBox();
    /**
     * HORIZONTAL LAYOUT
     *
     * In each segment group, there are 4 expanded segments,
     * and thus 3 response gaps.  vizConfig used by the helper 
     * above sets response
     * gaps to 5.  So total width of response gaps in expanded
     * view within a segment group is 15.
     * minGroupAvailableWidth is set to 100.
     * So with no groups, vizWidth = 115
     * 
     * VERTICAL LAYOUT
     * 
     * Config sets groupGapVertical to 10.  There are 0
     * segment group laid out vertically in the view with
     * all vertical groups active, so 0 vertical group gaps of 10 units each
     * totaling 0 units.
     * minGroupHeight in the config is set to 30.
     * So total vizHeight is:
     * 30 
     */
    expect(noGroupsBb).toEqual({ width: 115, height: 30 });
  });
})

describe("SegmentViz segment groups layout", () => {

  // one each
  const oneEachViz = allSegmentViz.find((c) => c.name === ('oneEach' as any));
  const viz = oneEachViz?.instance.getAllVisualizations()[0];
  describe('oneEach viz views', () => {
    const views = (viz && Array.isArray(viz.views)) ? viz.views : [];
    views.forEach((view) => {
      const questionKeyH = vizConfig_oneEach.groupingQuestionsHorizontal.map((q) => getQuestionKey(q))[0]
      const questionKeyV = vizConfig_oneEach.groupingQuestionsVertical.map((q) => getQuestionKey(q))[0]
      const activeQuestionKeys = view.activeGroupingQuestions.map((q) => getQuestionKey(q))
      if (activeQuestionKeys.includes(questionKeyH)) {
        if (activeQuestionKeys.includes(questionKeyV)) {
          //tests where both vertical and horizontal questions are active.
          describe('layout with both V and H questions active', () => {
            view.grid.rows.forEach((row, rowIdx) => {
              const expectedY = rowIdx * (vizConfig_oneEach.groupGapVertical + vizConfig_oneEach.minGroupHeight)
              const expectedHeight = vizConfig_oneEach.minGroupHeight
              test(`row ${rowIdx} y and height`, () => {
                expect(row.y).toBeCloseTo(expectedY)
                expect(row.height).toBeCloseTo(expectedHeight)
              })
            })
            const numResponseGaps = view.responseGroupDisplay === "expanded" ? 3 : 1;
            view.grid.columns.forEach((column, columnIdx) => {
              const expectedWidth = vizConfig_oneEach.minGroupAvailableWidth
                + numResponseGaps * vizConfig_oneEach.responseGap
              const expectedX = columnIdx * (
                vizConfig_oneEach.groupGapHorizontal
                + expectedWidth
              )
              test(`column ${columnIdx} x and width`, () => {
                expect(column.x).toBeCloseTo(expectedX)
                expect(column.width).toBeCloseTo(expectedWidth)
              })
            })
          })
        } else {
          //test case where horizontal is active and vertical is not
          describe('layout with only H question active', () => {
            const onlyRow = view.grid.rows[0]
            test('just one row', () => {
              expect(onlyRow).toBeDefined()
              expect(onlyRow.y).toBeCloseTo(0)
              const totalHeight = oneEachViz?.instance.getBoundingBox().height
              expect(totalHeight).toBeDefined()
              expect(onlyRow.height).toBeCloseTo(totalHeight!)
            })
            const numResponseGaps = view.responseGroupDisplay === "expanded" ? 3 : 1;
            view.grid.columns.forEach((column, columnIdx) => {
              const expectedWidth = vizConfig_oneEach.minGroupAvailableWidth
                + numResponseGaps * vizConfig_oneEach.responseGap
              const expectedX = columnIdx * (
                vizConfig_oneEach.groupGapHorizontal
                + expectedWidth
              )
              test(`column ${columnIdx} x and width`, () => {
                expect(column.x).toBeCloseTo(expectedX)
                expect(column.width).toBeCloseTo(expectedWidth)
              })
            })
          })
        }
      } else {
        if (activeQuestionKeys.includes(questionKeyV)) {
          //test case where vertical question is active and horizontal is not.
          describe('layout with only V question active', () => {
            view.grid.rows.forEach((row, rowIdx) => {
              const expectedY = rowIdx * (vizConfig_oneEach.groupGapVertical + vizConfig_oneEach.minGroupHeight)
              const expectedHeight = vizConfig_oneEach.minGroupHeight
              test(`row ${rowIdx} y and height`, () => {
                expect(row.y).toBeCloseTo(expectedY)
                expect(row.height).toBeCloseTo(expectedHeight)
              })
            })
            const onlyColumn = view.grid.columns[0]
            test('just one column', () => {
              expect(onlyColumn).toBeDefined()
              expect(onlyColumn.x).toBeCloseTo(0)
              const totalWidth = oneEachViz?.instance.getBoundingBox().width
              expect(totalWidth).toBeDefined()
              expect(onlyColumn.width).toBeCloseTo(totalWidth!)
            })
          })
        } else {
          //test case where neither horizontal nor vertical question is active
          describe('layout with neither H nor V question active', () => {
            const onlyRow = view.grid.rows[0]
            test('just one row', () => {
              expect(onlyRow).toBeDefined()
              expect(onlyRow.y).toBeCloseTo(0)
              const totalHeight = oneEachViz?.instance.getBoundingBox().height
              expect(totalHeight).toBeDefined()
              expect(onlyRow.height).toBeCloseTo(totalHeight!)
            })
            const onlyColumn = view.grid.columns[0]
            test('just one column', () => {
              expect(onlyColumn).toBeDefined()
              expect(onlyColumn.x).toBeCloseTo(0)
              const totalWidth = oneEachViz?.instance.getBoundingBox().width
              expect(totalWidth).toBeDefined()
              expect(onlyColumn.width).toBeCloseTo(totalWidth!)
            })
          })
        }
      }
    });
  });
  //TODO bothHorontally layout
  //TODO bothVertically layout
  //TODO noGroupings layout
});

