import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { fromIni } from '@aws-sdk/credential-providers';
import { parse } from 'csv-parse';
import { Readable } from 'stream';
import { config } from 'dotenv';
import path from 'path';
import { readFileSync } from 'fs';

config({ path: '../../../../.env' });

// Load S3 configuration
const dataSourcesPath = path.join(__dirname, '../../../data-sources.json');
const dataSourcesConfig = JSON.parse(readFileSync(dataSourcesPath, 'utf-8'));

// Use AWS profile from environment (supports SSO)
const awsProfile = process.env.AWS_PROFILE || 'default';

const s3Client = new S3Client({
  region: dataSourcesConfig.s3Config.region,
  credentials: fromIni({ profile: awsProfile }),
});

export async function fetchS3File(s3Key: string, fileType: 'json' | 'csv'): Promise<unknown[]> {
  const command = new GetObjectCommand({
    Bucket: dataSourcesConfig.s3Config.bucket,
    Key: s3Key,
  });

  try {
    const response = await s3Client.send(command);

    if (!response.Body) {
      throw new Error(`No body returned for S3 object: ${s3Key}`);
    }

    const content = await streamToString(response.Body as Readable);

    if (fileType === 'json') {
      return JSON.parse(content) as unknown[];
    } else if (fileType === 'csv') {
      return await parseCsvString(content);
    } else {
      throw new Error(`Unsupported file type: ${fileType}`);
    }
  } catch (error) {
    console.error(`Error fetching S3 file ${s3Key}:`, error);
    throw error;
  }
}

async function streamToString(stream: Readable): Promise<string> {
  const chunks: Buffer[] = [];

  for await (const chunk of stream) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }

  return Buffer.concat(chunks).toString('utf-8');
}

async function parseCsvString(content: string): Promise<unknown[]> {
  return new Promise((resolve, reject) => {
    const records: unknown[] = [];

    const parser = parse({
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    parser.on('data', (record: unknown) => {
      records.push(record);
    });

    parser.on('error', reject);

    parser.on('end', () => {
      resolve(records);
    });

    parser.write(content);
    parser.end();
  });
}

// Legacy functions for backward compatibility
export async function parseJson<T>(_filePath: string): Promise<T> {
  throw new Error('parseJson is deprecated. Use fetchS3File instead.');
}

export async function parseCsv<T>(_filePath: string): Promise<T[]> {
  throw new Error('parseCsv is deprecated. Use fetchS3File instead.');
}

export async function batchInsert<T extends Record<string, unknown>>(
  table: { insert: (data: T[]) => Promise<unknown> },
  data: T[],
  batchSize: number = 1000
): Promise<void> {
  console.log(`Inserting ${data.length} records in batches of ${batchSize}...`);

  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    await table.insert(batch);
    console.log(`Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(data.length / batchSize)}`);
  }
}