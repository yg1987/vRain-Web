import { describe, it, expect } from "vitest";
import { num2zh, getPageNumberZh, formatTitlePostfix } from "../num2zh";

describe("num2zh", () => {
  it("0-9 基本映射", () => {
    expect(num2zh(0)).toBe("〇");
    expect(num2zh(1)).toBe("一");
    expect(num2zh(2)).toBe("二");
    expect(num2zh(3)).toBe("三");
    expect(num2zh(4)).toBe("四");
    expect(num2zh(5)).toBe("五");
    expect(num2zh(6)).toBe("六");
    expect(num2zh(7)).toBe("七");
    expect(num2zh(8)).toBe("八");
    expect(num2zh(9)).toBe("九");
  });

  it("10-19", () => {
    expect(num2zh(10)).toBe("十");
    expect(num2zh(11)).toBe("十一");
    expect(num2zh(15)).toBe("十五");
    expect(num2zh(19)).toBe("十九");
  });

  it("20-99", () => {
    expect(num2zh(20)).toBe("二十");
    expect(num2zh(25)).toBe("二十五");
    expect(num2zh(30)).toBe("三十");
    expect(num2zh(99)).toBe("九十九");
  });

  it("100+", () => {
    expect(num2zh(100)).toBe("一百");
    expect(num2zh(101)).toBe("百一");
    expect(num2zh(200)).toBe("二百");
    expect(num2zh(400)).toBe("四百");
  });

  it("超出映射表范围使用回退算法", () => {
    const result = num2zh(1000);
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });
});

describe("getPageNumberZh", () => {
  it("返回字符数组", () => {
    const result = getPageNumberZh(25);
    expect(Array.isArray(result)).toBe(true);
    expect(result).toEqual(["二", "十", "五"]);
  });

  it("0 返回单字符数组", () => {
    const result = getPageNumberZh(0);
    expect(result).toEqual(["〇"]);
  });
});

describe("formatTitlePostfix", () => {
  it("替换 X 为中文数字", () => {
    expect(formatTitlePostfix("卷X", 1)).toBe("卷一");
    expect(formatTitlePostfix("卷X", 25)).toBe("卷二十五");
    expect(formatTitlePostfix("第X回", 103)).toBe("第百三回");
  });

  it("无 X 时不做替换", () => {
    expect(formatTitlePostfix("终", 1)).toBe("终");
  });
});
