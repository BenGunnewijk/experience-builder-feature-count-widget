import { AllWidgetProps, React } from "jimu-core";
import CountWidget from "../src/runtime/widget";
import { widgetRender, wrapWidget } from "jimu-for-test";
import { fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { CountWidgetConfig } from "../src/config";

const onRender = () => {
  console.log("Widget rendered");
};
const onTargetLayerViewChanged = (newLayerView) => {
  console.log("Widget has new target layerview:");
  console.log(newLayerView);
};
const defaultConfig: CountWidgetConfig = {
  testing: { onRender, onTargetLayerViewChanged },
};

const render = widgetRender();
const CountWidgetWithDefaults = wrapWidget(CountWidget, {
  config: defaultConfig,
});
// const CountWidgetWithDefaults = getWidgetWithDefaults(
//   CountWidget,
//   { config: defaultConfig }
// );

// Prepare a test environment for the widget where the feature count of layers can be "queried"
jest.mock("jimu-core", () => {
  return {
    ...jest.requireActual("jimu-core"),
    loadArcGISJSAPIModule: jest.fn().mockImplementation((moduleId) => {
      let module;
      if (moduleId === "esri/layers/FeatureLayer") {
        module = jest.fn().mockImplementation(() => {
          return {
            queryFeatureCount: (query) => Promise.resolve(5),
          };
        });
      }
      return Promise.resolve(module);
    }),
  };
});

describe("show-feature-count widget", () => {
  it("renders important elements", () => {
    // If the widget had config:
    // <Widget config={{ prop1: true }}></Widget>

    const { container } = render(
      <CountWidgetWithDefaults></CountWidgetWithDefaults>
    );

    // Make sure the widget title is rendered.
    // The title is used to visualize the feature count and thus the most important.
    let titleEle = container.querySelector("h5#count-title");
    expect(titleEle).not.toBeNull();
  });

  it("can handle a re-render", () => {
    const { container, rerender } = render(
      <CountWidgetWithDefaults></CountWidgetWithDefaults>
    );
    rerender(<CountWidgetWithDefaults></CountWidgetWithDefaults>);

    // Query an element in the re-rendered widget, just to be sure.
    let titleEle = container.querySelector("h5#count-title");
    expect(titleEle).not.toBeNull();
  });

  it("has a functioning refresh button", async () => {
    function doStuffOnRender() {
      console.log("Custom testing logic on widget render during testing.");
      // Resolve Promise here, to indicate the widget has rendered (and has the new Count)
    }
    const { container } = render(
      <CountWidgetWithDefaults
        config={{ testing: { onRender: doStuffOnRender } }}
      ></CountWidgetWithDefaults>
    );

    // The test is not perfect since the widget will show the count before refresh as well.
    // The button click will just replace 5/5 with 5/5.
    // Well, at least it will verify that the click doesn't explode.

    const buttonEle = container.querySelector("button#refresh-count");
    expect(buttonEle).not.toBeNull();
    if (buttonEle) fireEvent.click(buttonEle);

    const titleEle = container.querySelector("h5#count-title");
    await waitFor(() => expect(titleEle).toHaveTextContent("5 / 5 features"));
  });

  it("has a functioning settings button", () => {
    const { container } = render(
      <CountWidgetWithDefaults></CountWidgetWithDefaults>
    );

    const buttonEle = container.querySelector("button#show-settings");
    expect(buttonEle).not.toBeNull();
    if (buttonEle) fireEvent.click(buttonEle);

    // Instead, test if panel is expanded.
    const panelEle = container.querySelector("div.hidablePanel");
    expect(panelEle).toHaveClass("visible");
  });

  it("has a functioning refresh layers button", () => {
    const { container } = render(
      <CountWidgetWithDefaults></CountWidgetWithDefaults>
    );

    // The test is not perfect since the widget will show the count before refresh as well.
    // The button click will just replace 5/5 with 5/5.
    // Well, at least it will verify that the click doesn't explode.

    const buttonEle = container.querySelector("button#refresh-list");
    expect(buttonEle).not.toBeNull();
    if (buttonEle) fireEvent.click(buttonEle);

    const selectEle = container.querySelector("select#layer-choice-select");
    expect(selectEle).not.toBeNull();
    // Expect 2 options in the dropdown. This is based on the number of targeted feature layers.
    // TODO: Check how to mock FeatureLayers
    if (selectEle) {
      // This method seems worse, but the queryByRole method could be useful? (screen from @testing-library/react)
      // screen.getAllByRole('option')
      const optionEles = selectEle.querySelectorAll("option");
      expect(optionEles.length).toBe(2);
    }
  });
});
