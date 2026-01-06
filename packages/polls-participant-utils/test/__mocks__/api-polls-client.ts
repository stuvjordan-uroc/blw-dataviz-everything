/**
 * Manual mock for api-polls-client
 * This avoids Jest trying to parse the ES module output
 */

export const PollsApiClient = jest.fn().mockImplementation(() => ({
  getSession: jest.fn(),
  getVisualizationStream: jest.fn(),
}));
