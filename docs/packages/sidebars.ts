import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.
 */
const sidebars: SidebarsConfig = {
    typedocSidebar: [
        {
            type: "category",
            label: "Packages",
            link: {
                type: "doc",
                id: "index",
            },
            items: [
                {
                    type: "category",
                    label: "@stricli/core",
                    collapsed: true,
                    link: {
                        type: "doc",
                        id: "core/index",
                    },
                    items: require("./core/typedoc-sidebar.cjs"),
                },
                {
                    type: "category",
                    label: "@stricli/auto-complete",
                    collapsed: true,
                    link: {
                        type: "doc",
                        id: "auto-complete/index",
                    },
                    items: require("./auto-complete/typedoc-sidebar.cjs"),
                },
            ],
        },
    ],

    // But you can create a sidebar manually
    /*
  tutorialSidebar: [
    'intro',
    'hello',
    {
      type: 'category',
      label: 'Tutorial',
      items: ['tutorial-basics/create-a-document'],
    },
  ],
   */
};

export default sidebars;
