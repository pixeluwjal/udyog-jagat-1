export const salaryRanges = [
  "5-10 LPA",
  "10-20 LPA",
  "20-30 LPA",
  "30-50 LPA",
  "50+ LPA",
];

export const getSalaryRange = (rangeString: string) => {
  const range = { min: null, max: null };

  if (rangeString === "50+ LPA") {
    range.min = 5000000;
  } else if (rangeString !== "all") {
    const [minStr, maxStr] = rangeString.replace(" LPA", "").split("-");
    range.min = parseInt(minStr, 10) * 100000;
    range.max = parseInt(maxStr, 10) * 100000;
  }
  return range;
};
