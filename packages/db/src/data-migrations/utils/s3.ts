import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

/**
 * Get or create S3 client configured for data migration assets
 * Uses the default credential provider chain which includes:
 * - Environment variables
 * - SSO credentials
 * - EC2 instance metadata
 */
function getS3Client(): S3Client {
  const region = process.env.AWS_REGION || 'us-east-1';
  console.log(`Using AWS region: ${region}`);
  return new S3Client({ region });
}

/**
 * Fetch and parse a JSON file from S3
 * 
 * @param bucket - S3 bucket name
 * @param key - Object key (path to file)
 * @returns Parsed JSON object
 */
export async function fetchJsonFromS3<T = any>(
  bucket: string,
  key: string
): Promise<T> {
  try {
    const s3Client = getS3Client();
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const response = await s3Client.send(command);

    if (!response.Body) {
      throw new Error(`No body in S3 response for ${bucket}/${key}`);
    }

    // Convert stream to string
    const bodyString = await response.Body.transformToString();

    // Parse JSON
    return JSON.parse(bodyString) as T;
  } catch (error) {
    console.error(`Failed to fetch JSON from S3: ${bucket}/${key}`);
    throw error;
  }
}

/**
 * Get the S3 bucket name from environment variable
 * 
 * @returns S3 bucket name for data migrations
 */
export function getDataMigrationsBucket(): string {
  const bucket = process.env.DATA_MIGRATIONS_BUCKET;

  if (!bucket) {
    throw new Error('DATA_MIGRATIONS_BUCKET environment variable is not set');
  }

  return bucket;
}