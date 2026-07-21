import { getPageCount, getPageItems, getPaginationItems } from "../src/options/pagination";

describe("excerpt pagination", () => {
  it("shows ten excerpts on each page", () => {
    const excerpts = Array.from({ length: 23 }, (_, index) => index + 1);

    expect(getPageCount(excerpts.length, 10)).toBe(3);
    expect(getPageItems(excerpts, 1, 10)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(getPageItems(excerpts, 3, 10)).toEqual([21, 22, 23]);
  });

  it("uses compact numbered pagination for long histories", () => {
    expect(getPaginationItems(1, 12)).toEqual([1, 2, "ellipsis", 12]);
    expect(getPaginationItems(6, 12)).toEqual([1, "ellipsis", 5, 6, 7, "ellipsis", 12]);
    expect(getPaginationItems(12, 12)).toEqual([1, "ellipsis", 11, 12]);
  });
});
