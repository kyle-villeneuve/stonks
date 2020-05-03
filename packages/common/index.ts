export const pipe = (...fns: Function[]) => (...x: any[]) => {
  return fns.reduce((v, f) => f(v), x);
};
