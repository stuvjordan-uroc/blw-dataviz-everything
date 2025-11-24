import fs from 'fs';
import path from 'path';
import type { SessionConfig } from 'shared-schemas';
import type { VizConfigSegments } from '../src/segmentViz/types';
import { parseSurveyCsvToRespondents } from './helpers/parseRespondents';
import { SegmentViz } from '../src/segmentViz/SegmentViz';



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

describe("SegmentViz", () => {
  const sessionConfig: SessionConfig = {
    responseQuestions: [
      {
        batteryName: "test",
        subBattery: "test",
        varName: "mood",
        responseGroups: {
          collapsed: [
            {
              label: "sad",
              values: [0, 1]
            },
            {
              label: "happy",
              values: [2, 3]
            }
          ],
          expanded: [
            {
              label: "very sad",
              values: [0]
            },
            {
              label: "sad",
              values: [1]
            },
            {
              label: "happy",
              values: [2]
            },
            {
              label: "very happy",
              values: [3]
            }
          ]
        }
      }
    ],
    groupingQuestions: [
      {
        batteryName: "test",
        subBattery: "test",
        varName: "gender",
        responseGroups: [
          {
            label: "male",
            values: [0]
          },
          {
            label: "female",
            values: [1]
          }
        ]
      },
      {
        batteryName: "test",
        subBattery: "test",
        varName: "height",
        responseGroups: [
          {
            label: "short",
            values: [0]
          },
          {
            label: "tall",
            values: [1]
          }
        ]
      }
    ]
  }
  const fixturePath = path.join(__dirname, 'fixtures', 'survey_responses.csv');
  const respondentsData = parseSurveyCsvToRespondents(fixturePath);

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
  const vizConfigSegments: VizConfigSegments = {
    groupGapHorizontal: 10,
    groupGapVertical: 10,
    groupingQuestionsHorizontal: [
      {
        batteryName: "test",
        subBattery: "test",
        varName: "height"
      },
    ],
    groupingQuestionsVertical: [
      {
        batteryName: "test",
        subBattery: "test",
        varName: "gender"
      }
    ],
    responseGap: 5,
    segmentGroupHeight: 50,
    segmentGroupWidth: 10
  }
  const segmentViz = new SegmentViz(
    sessionConfig,
    vizConfigSegments,
    respondentsData
  )

  test("getBoundingBox", () => {
    const bb = segmentViz.getBoundingBox()
    /**
     * HORIZONTAL LAYOUT
     *
     * In each segment group, there are 4 expanded segments,
     * and thus 3 response gaps.  vizconfig above sets response
     * gaps to 5.  So total width of response gaps in expanded
     * view within a segment group is 15.
     * segmentGroupWidth is set to 10.  10X15 = 150.
     * That means that in the view in all horizontal groups are 
     * active, each segment group is 150 units wide.
     * There are two segment groups on the horizontal axis
     * in the view with all horizontal groups active,
     * so that 2 X 150 = 300 units.  Then we have the groupGapHorizontal
     * which the config sets to 10.  So the vizWidth should be 310.
     * 
     * VERTICAL LAYOUT
     * 
     * Config sets groupGapVertical to 10.  There are two 
     * segment groups laid out vertically in the view with
     * all vertical groups active, so 1 vertical group gap of 10 units.
     * segmentGroupHeight in the config is set to 50.
     * So total vizHeight is:
     * 2 X 50 + 10 = 110. 
     */
    expect(bb).toEqual({ width: 310, height: 110 });
  })

  test("getVisualizationForQuestion", () => {
    const viz = segmentViz.getVisualizationForQuestion({
      batteryName: "test",
      subBattery: "test",
      varName: "mood"
    })
    expect(viz).toBeDefined();
    // There are 2 grouping questions (gender,height) each optional => 2^2=4 configs × 2 displays = 8 views
    expect(viz!.views.length).toBe(8);
    // Points should equal total processed respondents who provided a valid mood in expanded groups (20)
    expect(viz!.points.length).toBe(20);

    // Find the view where both grouping questions are active and expanded
    const fullExpandedView = viz!.views.find(v => v.activeGroupingQuestions.length === 2 && v.responseGroupDisplay === 'expanded');
    expect(fullExpandedView).toBeDefined();
    // With 2 vertical × 2 horizontal group combinations and 4 expanded response groups, segments = 2*2*4 = 16
    expect(fullExpandedView!.segments.length).toBe(16);
  })

  test("getSplits", () => {
    const splits = segmentViz.getSplits()
    // There are 2 grouping questions with 2 groups each -> (2+1)*(2+1)=9 splits (including null filters)
    expect(splits.length).toBe(9);

    // Find the 'all respondents' split (all responseGroup === null)
    const allSplit = splits.find(s => s.groups.every(g => g.responseGroup === null));
    expect(allSplit).toBeDefined();

    const rq = allSplit!.responseQuestions.find(rq => rq.varName === 'mood');
    expect(rq).toBeDefined();

    // Expanded groups order: very sad(0), sad(1), happy(2), very happy(3)
    const expanded = rq!.responseGroups.expanded;
    expect(expanded[0].totalCount).toBe(2);
    expect(expanded[1].totalCount).toBe(4);
    expect(expanded[2].totalCount).toBe(8);
    expect(expanded[3].totalCount).toBe(6);
  })


})
