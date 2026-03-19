function flat(arr) {
  const result = [];
  for (const child of arr.flat(Infinity)) {
    result.push(child);
  }
  return result;
}
console.log(flat([1, [2, [3, [4, [5,{hhh:[[2]]}]]]]]));
