import { buildApplication, buildRouteMap } from "npm:@stricli/core";
import { command as echo } from "./commands/echo.ts";
import {
  buildUnaryMathCommand,
  buildBinaryMathCommand,
  buildVariadicMathCommand,
} from "./commands/math.ts";

const math = buildRouteMap(
  {
    routes: {
      log: buildUnaryMathCommand("log"),
      ln: buildUnaryMathCommand("log"),
      sqrt: buildUnaryMathCommand("sqrt"),
      "√": buildUnaryMathCommand("sqrt"),
      pow: buildBinaryMathCommand("pow"),
      max: buildVariadicMathCommand("max"),
      min: buildVariadicMathCommand("min"),
    } as const,
    docs: {
      brief: "Various math operations",
      description:
        "Math utilities: unary (log, sqrt), binary (pow), and variadic (max, min).",
      examples: [
        "math ln 10",
        "math sqrt 144",
        "math pow 2 10",
        "math max 3 9 4 7",
        "math min 3 9 4 7",
      ],
    },
  } as const
);

const root = buildRouteMap(
  {
    routes: {
      echo,
      math,
    } as const,
    docs: {
      brief: "All available example commands",
      description:
        "A small showcase CLI featuring an echo utility and a math toolbox.",
      examples: ["echo hello world", "math sqrt 16", "math max 1 2 3 4"],
    },
  } as const
);

export const app = buildApplication(root, {
  name: "stricli-deno-example",
} as const);
