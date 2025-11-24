import fs from 'fs';
import path from 'path';
import type { RespondentData } from '../../src/types';

/**
 * Parse the survey_responses.csv fixture into an array of RespondentData.
 * Rules:
 * - Numeric cells become numbers.
 * - "NULL" becomes a response with `response: null` for that question.
 * - "SKIPPED" means the respondent has no response entry for that question.
 */
export function parseSurveyCsvToRespondents(csvPath: string): RespondentData[] {
  const content = fs.readFileSync(csvPath, 'utf8');
  const lines = content.split(/\r?\n/);
  const dataLines = lines.filter(l => l.trim().length > 0 && !l.trim().startsWith('#'));
  const headerLine = dataLines.shift();
  if (!headerLine) return [];
  const headers = headerLine.split(',').map(h => h.trim());

  // Expect headers: id,mood,gender,height
  const rows = dataLines.map(line => line.split(',').map(c => c.trim()));

  // Group by respondent id (each row is a separate respondent in this fixture)
  const respondents: RespondentData[] = rows.map(cols => {
    const values: Record<string, string> = {};
    headers.forEach((h, i) => (values[h] = cols[i] ?? ''));

    const respondentId = Number(values['id']);

    const responses: RespondentData['responses'] = [];

    const questions = ['mood', 'gender', 'height'];
    for (const q of questions) {
      const raw = values[q];
      if (raw === 'SKIPPED' || raw === '') {
        // skip entirely
        continue;
      }
      if (raw === 'NULL') {
        responses.push({ varName: q, batteryName: 'test', subBattery: 'test', response: null });
        continue;
      }
      if (/^\d+$/.test(raw)) {
        responses.push({ varName: q, batteryName: 'test', subBattery: 'test', response: Number(raw) });
        continue;
      }
      // fallback: if non-numeric (shouldn't happen in coded fixture), try to parse
      const n = Number(raw);
      responses.push({ varName: q, batteryName: 'test', subBattery: 'test', response: Number.isNaN(n) ? null : n });
    }

    return {
      respondentId,
      responses,
    } as RespondentData;
  });

  return respondents;
}
