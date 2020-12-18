// Link.react.test.js
import React from "react";
import { render, screen } from "@testing-library/react";
import Header from "../src/Header";

it("render GitHubIcon correctly", () => {
  const dom = `
<div id="root" class="hasRows">Sample Site</div>
`;
  document.body.innerHTML = dom;

  Object.defineProperty(window, "matchMedia", {
    value: jest.fn(() => {
      return {
        matches: true,
      };
    }),
  });

  render(
    <Header
      data={{
        index: 1,
        isLoading: () => {
          return true;
        },
      }}
    />
  );

  expect(screen.getByTitle("github").closest("a")).toHaveAttribute(
    "href",
    "https://github.com/osmlab/name-suggestion-index"
  );
});
