We're perform tests that show that Statistics and the SegmentViz class work as expected when used as intended.

Here's the basic flow of the tests, which simulate the usage patterns we want to support:

1. Instantiate an instance of Statistics, both with and without initial data.

- (DONE -- but need to check hand computations) Test: if the Statistics instance is instantiated with data, test that initially computed statistics (in the Statistics `split` field) are correct, both with and without a weight question.

2. Instantiate an instance of SegmentViz, passing the constructor a ref to the Statistics instance created in Step 1.

- (DONE -- but need to check hand computations) Test: Regardless of whether data has been passed to the Statistics instance, test that the segmentGroup bounds are correctly initialized
- (DONE) Test: If data has been passed to the Statistics instance, test that the segments and points have been populated correctly. Note that points population should be tested both with syntheticSampleSize defined and undefined.

3. Feed additional data to the Statistics instance created in Step 1.

- (DONE) Test: Tests that updated (in the Statistics `split` field) are correct, and that the diffs produced by the update are correct.
- (IN PROGRESS -- NEED TO add logic to test that diffs of segments are as required. THEN I'M DONE!)Test: Test that segments and points have been populated correctly in response to the update, and that the diffs produced by SegmentViz in response to the update are correct.
