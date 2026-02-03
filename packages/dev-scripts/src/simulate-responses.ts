#!/usr/bin/env tsx
/**
 * Simulate multiple respondents answering a poll
 * 
 * Usage: 
 *   npm run simulate <slug> <count> [--interval <ms>]
 * 
 * Examples:
 *   npm run simulate abc123xyz 10              # 10 instant responses
 *   npm run simulate abc123xyz 20 --interval 2000  # 20 responses, 2s apart
 * 
 * This script:
 * 1. Fetches the session configuration
 * 2. Generates random responses for each question
 * 3. Submits responses via POST /api/responses
 * 4. Optionally delays between submissions to simulate real-time polling
 */

import type { SubmitResponsesDto, SessionResponse, RespondentAnswer } from 'shared-types';

const API_BASE_URL = process.env.API_URL || 'http://localhost:3003';

/**
 * Parse command-line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error('Usage: npm run simulate <slug> <count> [--interval <ms>]');
    console.error('');
    console.error('Examples:');
    console.error('  npm run simulate abc123xyz 10');
    console.error('  npm run simulate abc123xyz 20 --interval 2000');
    process.exit(1);
  }

  const slug = args[0];
  const count = parseInt(args[1], 10);

  if (isNaN(count) || count <= 0) {
    console.error('Error: count must be a positive integer');
    process.exit(1);
  }

  let interval = 0;
  const intervalIdx = args.indexOf('--interval');
  if (intervalIdx !== -1 && args[intervalIdx + 1]) {
    interval = parseInt(args[intervalIdx + 1], 10);
    if (isNaN(interval) || interval < 0) {
      console.error('Error: interval must be a non-negative integer');
      process.exit(1);
    }
  }

  return { slug, count, interval };
}

/**
 * Get session configuration
 */
async function getSession(slug: string): Promise<SessionResponse> {
  const response = await fetch(`${API_BASE_URL}/api/sessions/${slug}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch session: ${response.statusText}`);
  }

  return await response.json() as SessionResponse;
}

/**
 * Generate random responses for all questions in the session
 */
function generateRandomResponses(session: SessionResponse): RespondentAnswer[] {
  return session.config.questionOrder.map(question => {
    // Find the number of possible responses for this question
    // Look in the first visualization's response question to get response options
    const viz = session.config.visualizations.find(
      v => v.responseQuestion.question.varName === question.varName &&
        v.responseQuestion.question.batteryName === question.batteryName &&
        v.responseQuestion.question.subBattery === question.subBattery
    );

    // If this question is a response question, count its response groups
    // Otherwise default to 4 options (typical Likert scale)
    const maxResponseIndex = viz
      ? viz.responseQuestion.responseGroups.expanded.length - 1
      : 3;

    return {
      varName: question.varName,
      batteryName: question.batteryName,
      subBattery: question.subBattery,
      responseIndex: Math.floor(Math.random() * (maxResponseIndex + 1)),
    };
  });
}

/**
 * Submit responses for a single respondent
 */
async function submitResponses(
  sessionId: number,
  endpoint: string,
  answers: RespondentAnswer[]
): Promise<void> {
  const payload: SubmitResponsesDto = {
    sessionId,
    answers,
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to submit responses: ${response.statusText}\n${error}`);
  }
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Main execution
 */
async function main() {
  const { slug, count, interval } = parseArgs();

  try {
    console.log(`📡 Fetching session: ${slug}...`);
    const session = await getSession(slug);
    console.log(`✅ Session found: ${session.description}`);
    console.log(`   Questions: ${session.config.questionOrder.length}`);
    console.log(`   Status: ${session.isOpen ? 'Open' : 'Closed'}\n`);

    if (!session.isOpen) {
      console.error('❌ Error: Session is closed and not accepting responses');
      process.exit(1);
    }

    console.log(`🤖 Simulating ${count} respondent${count > 1 ? 's' : ''}...`);
    if (interval > 0) {
      console.log(`   Interval: ${interval}ms between submissions\n`);
    } else {
      console.log('   Submitting all responses immediately\n');
    }

    for (let i = 1; i <= count; i++) {
      const answers = generateRandomResponses(session);

      try {
        await submitResponses(session.id, session.endpoints.submitResponse, answers);
        console.log(`   ✓ Respondent ${i}/${count} submitted`);

        // Sleep between submissions if interval specified
        if (interval > 0 && i < count) {
          await sleep(interval);
        }
      } catch (error) {
        console.error(`   ✗ Respondent ${i}/${count} failed:`, error instanceof Error ? error.message : error);
      }
    }

    console.log('\n✅ Simulation complete!');
    console.log(`🌐 View results at: http://localhost:3000/polls/${slug}`);

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
