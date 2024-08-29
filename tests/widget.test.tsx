import { Immutable, React, UseDataSource } from "jimu-core";
import CountWidget from "../src/runtime/widget";
import { widgetRender, wrapWidget } from "jimu-for-test";
import { act, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { CountWidgetConfig } from "../src/config";
import defaultTranslations from "../src/runtime/translations/default";

const render = widgetRender();
const defaultConfig: CountWidgetConfig = {};
const CountWidgetWithDefaults = wrapWidget(CountWidget, {
  config: defaultConfig,
});

// To prevent each console.log() from being ~5 lines of text
const jestConsole = console;
beforeEach(() => {
  global.console = require("console");
});
afterEach(() => {
  global.console = jestConsole;
});

// Name of functions that are used in jest.mock need to start with "mock"
// Plus some other requirements: https://jestjs.io/docs/manual-mocks#using-with-es-module-imports
function mockLayerView(id: string) {
  return {
    id: id,
    layer: {
      type: "feature",
      load: () => Promise.resolve(null),
    },
    view: {
      queryFeatureCount: (q) => 5,
      createQuery: () => {
        return { geometry: null };
      },
      view: { extent: "fake extent" },
    },
    whenCurrentLayerViewNotUpdating: () => {},
  };
}
function mockLayerViews() {
  return {
    "mock-jimu-layerview-1": mockLayerView("mock-jimu-layerview-1"),
    "mock-jimu-layerview-2": mockLayerView("mock-jimu-layerview-2"),
  };
}

jest.mock("jimu-arcgis", () => ({
  __esModule: true,
  // requireActual of arcgis might slow things down needlessly (Part of copy-paste).
  ...jest.requireActual("jimu-arcgis"),
  MapViewManager: class {
    static getInstance() {
      return {
        getAllJimuMapViews: () => {
          return [
            {
              id: "mock-jimu-map-view",
              getJimuLayerViewByDataSourceId: mockLayerViews,
              whenJimuLayerViewLoaded: () => {},
              whenAllJimuLayerViewLoaded: mockLayerViews,
            },
          ];
        },
      };
    }
  },
}));

/**
 * A query that will match any of these:
 * * `... / ... features`
 * * `... / 1234 features`
 * * `1234 / 1234 features`
 */
const titleRegexp = new RegExp(
  `(([0-9]+|\.\.\.) \/ ([0-9]+|\.\.\.) ${defaultTranslations.countUnit})`,
  "i"
);

describe("show-feature-count widget", () => {
  it("renders important elements", async () => {
    // If the widget had config:
    // <Widget config={{ prop1: true }}></Widget>

    // From the React docs: https://react.dev/reference/react/act#await-act-async-actfn
    // await act(async () => { root.render(<TestComponent />) });
    // From the error message when not using act:
    // Awaiting the render ensures that you're testing the behavior the user would see in the browser.
    // Learn more at https://reactjs.org/link/wrap-tests-with-act
    const { getByText } = await act(async () => {
      return render(<CountWidgetWithDefaults></CountWidgetWithDefaults>);
    });

    // getBy... is recommended over container.querySelector("h5#count-title")
    // Those functions better follow the way a user would also look for the element.
    // As a bonus, null-checks are handled by the testing library
    let titleEle = getByText(titleRegexp);

    // Make sure the widget title is rendered.
    // The title is used to visualize the feature count and thus the most important.
    expect(titleEle).toBeVisible();
    expect(titleEle).toHaveRole("Title");
  });

  it("can handle a re-render", async () => {
    const { rerender } = await act(async () => {
      return render(<CountWidgetWithDefaults></CountWidgetWithDefaults>);
    });

    await act(async () => {
      rerender(<CountWidgetWithDefaults></CountWidgetWithDefaults>);
    });

    // Maybe get an element in the re-rendered widget, just to be sure?
  });

  it("can handle layer definitions from useDataSources", async () => {
    // It might be bad design to have a unit test create it's own mock object.
    // For now it's the easiest way to adjust Widget properties per test.
    const mockDatasources = Immutable([
      { dataSourceId: "mock-datasource-id1" } as UseDataSource,
      { dataSourceId: "mock-datasource-id2" } as UseDataSource,
    ]);

    const { getByText } = await act(async () => {
      return render(
        <CountWidgetWithDefaults
          useDataSources={mockDatasources}
        ></CountWidgetWithDefaults>
      );
    });

    let titleEle = getByText(titleRegexp);
    expect(titleEle).toBeVisible();
  });

  it("has a functioning refresh button", async () => {
    const { getByLabelText, getByText } = await act(async () => {
      return render(<CountWidgetWithDefaults></CountWidgetWithDefaults>);
    });

    // The test is not perfect since the widget will show the count before refresh as well.
    // The button click will just replace 5/5 with 5/5.
    // Well, at least it will verify that the click doesn't explode.

    const buttonEle = getByLabelText(defaultTranslations.refreshCountTooltip);

    // act should be also be used when firing events that update state.
    // It looks weird since fireEvent.click is synchronous. But it does properly wait.
    await act(async () => {
      fireEvent.click(buttonEle);
    });

    let titleEle = getByText(titleRegexp);

    expect(titleEle).toHaveTextContent("5 / 5 features");
  });

  it("has a functioning settings button", async () => {
    const { getByLabelText } = await act(async () => {
      return render(<CountWidgetWithDefaults></CountWidgetWithDefaults>);
    });

    const buttonEle = getByLabelText(defaultTranslations.showSettingsTooltip);

    await act(async () => {
      fireEvent.click(buttonEle);
    });

    // The select element is only visible when the panel is expanded.
    // That is only the case after the settings button has been clicked.
    const listSelectEle = getByLabelText(defaultTranslations.listSelectTooltip);
    expect(listSelectEle).toBeVisible();
  });

  it("has a functioning refresh layers button", async () => {
    const { getByLabelText } = await act(async () => {
      return render(<CountWidgetWithDefaults></CountWidgetWithDefaults>);
    });

    const buttonEle = getByLabelText(defaultTranslations.refreshListTooltip);

    await act(async () => {
      fireEvent.click(buttonEle);
    });

    // Check refresh results?
  });

  it("shows available layers in the select options", async () => {
    const { getAllByRole } = await act(async () => {
      return render(<CountWidgetWithDefaults></CountWidgetWithDefaults>);
    });

    const selectOptions = getAllByRole("option");
    expect(selectOptions.length).toBe(2);
  });
});
