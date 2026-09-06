export const moonFloor = (x, z) => {
  const radial = Math.min(1, (x * x + z * z) / (18 * 18));
  return -4 + 5.2 * Math.sqrt(1 - radial);
};
