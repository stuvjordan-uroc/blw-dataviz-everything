export function generateCartesian<T>(options: T[][]): T[][] {
  return options.reduce(
    (combinations, optionArray) => extendCombinations(combinations, optionArray),
    [[]] as T[][]
  )
}

function extendCombinations<T>(existing: T[][], newOptions: T[]): T[][] {
  const extended: T[][] = [];

  for (const combination of existing) {
    for (const option of newOptions) {
      extended.push([...combination, option]);
    }
  }

  return extended;
}