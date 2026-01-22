// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import { describe, expect, it } from "vitest";
// eslint-disable-next-line no-restricted-imports
import { formatException, InternalError } from "../../src/util/error";

describe("formatException", () => {
    it("should return stack trace for Error objects", () => {
        const err = new Error("test error");
        const result = formatException(err);
        expect(result).toContain("Error: test error");
    });

    it("should return error message if stack is undefined", () => {
        const err = new Error("no stack");
        err.stack = undefined;
        const result = formatException(err);
        expect(result).toBe("Error: no stack");
    });

    it("should format plain objects as JSON", () => {
        const obj = { message: "bad", code: 404 };
        const result = formatException(obj);
        expect(result).toBe('{"message":"bad","code":404}');
    });

    it("should not return [object Object] for plain objects", () => {
        const obj = { error: "something went wrong" };
        const result = formatException(obj);
        expect(result).not.toBe("[object Object]");
    });

    it("should handle strings", () => {
        expect(formatException("error string")).toBe("error string");
    });

    it("should handle numbers", () => {
        expect(formatException(404)).toBe("404");
    });

    it("should handle null", () => {
        expect(formatException(null)).toBe("null");
    });

    it("should handle undefined", () => {
        expect(formatException(undefined)).toBe("undefined");
    });

    it("should handle arrays", () => {
        const arr = [1, 2, 3];
        const result = formatException(arr);
        expect(result).toBe("[1,2,3]");
    });

    it("should handle circular references gracefully", () => {
        const obj: Record<string, unknown> = { a: 1 };
        obj["self"] = obj;
        const result = formatException(obj);
        // Should not throw, fallback to String() which returns "[object Object]"
        expect(result).toBe("[object Object]");
    });

    it("should handle nested objects", () => {
        const obj = { error: { code: 500, message: "server error" } };
        const result = formatException(obj);
        expect(result).toContain("code");
        expect(result).toContain("500");
    });

    it("should handle objects with undefined values", () => {
        const obj = { message: "error", detail: undefined };
        const result = formatException(obj);
        expect(result).toContain("message");
    });

    it("should handle empty objects", () => {
        const result = formatException({});
        expect(result).toBe("{}");
    });

    it("should handle objects with special characters in values", () => {
        const obj = { message: 'error: "quoted"' };
        const result = formatException(obj);
        expect(result).toContain("error");
        expect(result).toContain("quoted");
    });

    it("should handle boolean values", () => {
        expect(formatException(true)).toBe("true");
        expect(formatException(false)).toBe("false");
    });

    it("should handle custom Error subclasses", () => {
        const err = new InternalError("internal error");
        const result = formatException(err);
        // InternalError extends Error, so it should get stack trace treatment
        expect(result).toContain("Error: internal error");
    });
});
