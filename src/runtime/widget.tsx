/** @jsx jsx */
import { useState, useCallback, useEffect } from "react";
import { type AllWidgetProps, jsx, UseDataSource } from "jimu-core";
import { JimuFeatureLayerView, MapViewManager } from "jimu-arcgis";
import { Card, Label, Tooltip } from "jimu-ui";

import "./widget.css";
import defaultI18nMessages from "./translations/default";
import { RefreshButton } from "./refresh-button";
import { SettingsButton } from "./settings-button";
import { CollapsablePanel } from "./collapsable-panel";

import { type CountWidgetConfigIM } from "../config";

/**
 * Shows the count of features within view vs. total features in the layer.
 *
 * Usage of props.useDataSources[] is based off:
 * * https://github.com/Esri/arcgis-experience-builder-sdk-resources/tree/master/widgets/feature-layer-function
 */
export default function Widget(props: AllWidgetProps<CountWidgetConfigIM>) {
  const [queryCount, setQueryCount] = useState<number | null>(null);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Array of feature layers that the user can choose from (as view).
  const [featureLayerViews, setFeatureLayerViews] = useState<
    JimuFeatureLayerView[]
  >([]);
  // And an index of the current choice in that array.
  const [currentLayerChoice, setCurrentLayerChoice] = useState(0);

  // A reference to the target FeatureLayer (As a view).
  const [targetLayerView, setTargetLayerView] =
    useState<JimuFeatureLayerView>();

  /**
   * Get a string value from the localized translations.
   * Defaults to English strings from ./translations/default.ts
   */
  const fromLocalization = useCallback(
    (itemKey: string) => {
      return props.intl.formatMessage({
        id: itemKey,
        defaultMessage: defaultI18nMessages[itemKey],
      });
    },
    [props.intl]
  );

  const updateTargetLayerAndView = useCallback(async () => {
    // Stop targeting a layer when the new FeatureLayer array is empty
    if (!featureLayerViews.length) {
      setTargetLayerView(undefined);
      return;
    }

    // Validate the index
    if (currentLayerChoice < 0) {
      console.log("layerChoice index cannot be negative.");
      return;
    }
    if (currentLayerChoice >= featureLayerViews.length) {
      console.error(
        "Widget can't target layer. layerChoice index is outside bounds."
      );
      return;
    }

    const chosenLayer = featureLayerViews[currentLayerChoice];

    // Make sure selected layer is loaded, even if not part of the original Map view.
    await chosenLayer.layer.load();

    setTargetLayerView(chosenLayer);
  }, [currentLayerChoice, featureLayerViews]);

  /**
   * Gets a list of feature layers
   * * If given, from a configured set of layers
   * * Else, by selecting all available.
   *
   * Check if creator of Web App in Experience Builder wants to use a selected datasource instead of all feature layers.
   * They configure this with the "Connect to data" slider.
   */
  const updateListOfFeatureLayers = useCallback(async () => {
    let layers: JimuFeatureLayerView[];
    if (props.useDataSourcesEnabled) {
      if (!props.useDataSources || !props.useDataSources.length) {
        console.debug(
          "The widget 'Show Feature Count' is configured to use no layers. Either toggle off Connect to data or configure its layers."
        );

        layers = [];
      } else {
        // Get feature layers from selected data sources.
        layers = await getFeatureLayersFromDatasources(
          props.useDataSources.asMutable({ deep: true })
        );
      }
    } else {
      // Get feature layers from ALL.
      layers = await getFeatureLayersAll();
    }

    setFeatureLayerViews(layers);
  }, [setFeatureLayerViews, props.useDataSourcesEnabled, props.useDataSources]);

  const updateCounts = useCallback(async () => {
    if (!targetLayerView) {
      setTotalCount(null);
      setQueryCount(null);
      return;
    }

    // Get total # of features
    const allFeaturesCount = await targetLayerView.view.queryFeatureCount();
    setTotalCount(allFeaturesCount);
    setQueryCount(null);

    // Get # of features in view (This can take a little longer)
    const query = targetLayerView.view.createQuery();
    query.geometry = targetLayerView.view.view.extent;
    const featuresInViewCount = await targetLayerView.view.queryFeatureCount(
      query
    );
    setQueryCount(featuresInViewCount);
  }, [targetLayerView]);

  const toggleSettings = useCallback(() => {
    setIsSettingsOpen((v) => !v);
  }, []);

  // The update didn't properly trigger on init with the useDataSources dependencies.
  useEffect(() => {
    updateListOfFeatureLayers();
  }, []);

  // Fetch the available Feature Layers when datasource config is changed.
  useEffect(() => {
    updateListOfFeatureLayers();
  }, [props.useDataSourcesEnabled, props.useDataSources]);

  // Store references to the selected layer and its view.
  // This saves the need to recreate them for each update of feature counts.
  useEffect(() => {
    updateTargetLayerAndView();
  }, [currentLayerChoice, featureLayerViews]);

  // When new layers are available, set the first as selected.
  useEffect(() => {
    setCurrentLayerChoice(0);
  }, [featureLayerViews]);

  // When a new layer is selected, immediately poll the feature counts.
  useEffect(() => {
    updateCounts();
  }, [targetLayerView]);

  return (
    <Card style={{ padding: 0 }}>
      <div className="flexLeftRight" style={{ margin: 5 }}>
        {/* Bugfix: By default, width grew to fit long text causing other flex items to be pushed outside flexbox. */}
        <div style={{ minWidth: "0" }}>
          <Tooltip
            title={fromLocalization("countTitleTooltip")}
            enterDelay={200}
            enterNextDelay={200}
          >
            {/* tabIndex to make the title focussable for the tooltip. */}
            {/* userSelect "text" to allow selecting the feature count for copy-pastas. */}
            <h5
              id="count-title"
              tabIndex={0}
              className="ellipsisOverflow"
              style={{ userSelect: "text" }}
              role="Title"
            >
              {queryCount === null ? "..." : queryCount} /{" "}
              {totalCount === null ? "..." : totalCount}{" "}
              {fromLocalization("countUnit")}
            </h5>
          </Tooltip>
          {/* userSelect "all" to allow full layername selection, even when the name is truncated. */}
          <Label className="ellipsisOverflow" style={{ userSelect: "all" }}>
            {(targetLayerView && targetLayerView.layer.title) || "- no layer -"}
          </Label>
        </div>
        <div className="flexLeftRight" style={{ flex: "none" }}>
          <RefreshButton
            onClick={updateCounts}
            tooltipProps={{ title: fromLocalization("refreshCountTooltip") }}
            buttonProps={{
              name: fromLocalization("refreshCountTooltip"),
              id: "refresh-count",
            }}
          ></RefreshButton>
          <SettingsButton
            onClick={toggleSettings}
            tooltipProps={{ title: fromLocalization("showSettingsTooltip") }}
            buttonProps={{
              name: fromLocalization("showSettingsTooltip"),
              id: "show-settings",
            }}
          ></SettingsButton>
        </div>
      </div>
      <CollapsablePanel isOpen={isSettingsOpen}>
        <div className="flexLeftRight" style={{ margin: 5 }}>
          <label
            title={fromLocalization("listSelectTooltip")}
            style={{ flex: 1 }}
          >
            <select
              id="layer-choice-select"
              aria-label={fromLocalization("listSelectTooltip")}
              onChange={(e) => setCurrentLayerChoice(e.target.selectedIndex)}
              style={{ width: "100%" }}
            >
              {featureLayerViews.map((lView, i) => (
                <option key={lView.id} value={i}>
                  {lView.layer.title}
                </option>
              ))}
            </select>
          </label>
          <RefreshButton
            onClick={updateListOfFeatureLayers}
            tooltipProps={{ title: fromLocalization("refreshListTooltip") }}
            buttonProps={{
              name: fromLocalization("refreshListTooltip"),
              id: "refresh-list",
            }}
            style={{ flex: "none" }}
          ></RefreshButton>
        </div>
      </CollapsablePanel>
    </Card>
  );
}

// The JimuLayerView references on a mapView are immediately available.
// However, their arcgis view and layer references are not.
// There are so many ways to get these objects, and ways to check if they're ready, that I got a little lost.
// I think I found the methods best suited for my needs.
// Something that will be useful in many scenarios is to store a reference to JimuLayerView instead of the view or the layer.
// It has a reference to both the layer and view, and also has easier to use "whenLayerLoaded" type events.
// The docs recommend that you use <JimuLayerViewComponent></JimuLayerViewComponent>
// But I found that a bit

/**
 * Get feature layers by using the widget properties.
 *
 * This is configured by the creator of the Web App in Experience Builder.
 * `settings.tsx` is prepared to let the user select this.
 * Jimu forwards the selected datasource with the useDataSources prop.
 */
const getFeatureLayersFromDatasources = async (
  useDataSources: UseDataSource[]
) => {
  const mvm = MapViewManager.getInstance();
  const mapViews = mvm.getAllJimuMapViews();
  if (mapViews.length !== 1) {
    console.warn("No map available to search for layers.");
    return [];
  }
  const jMapView = mapViews[0];

  const promiseJLayerViews = useDataSources.map((datasourceDef) => {
    const jLayerView = jMapView.getJimuLayerViewByDataSourceId(
      datasourceDef.dataSourceId
    );

    return jMapView.whenJimuLayerViewLoaded(jLayerView.id);
  });

  const jLayerViews = await Promise.all(promiseJLayerViews);
  const jFeatureLayerViews = jLayerViews.filter(
    (jlv) => jlv.layer.type === "feature"
  ) as JimuFeatureLayerView[];

  const allNotUpdatingPromise = jFeatureLayerViews.map((jLayerView) => {
    return jLayerView.whenCurrentLayerViewNotUpdating();
  });
  await Promise.all(allNotUpdatingPromise);

  return jFeatureLayerViews;
};

/** Get all available feature layers. */
const getFeatureLayersAll = async () => {
  const mapViewManager = MapViewManager.getInstance();
  const mapViews = mapViewManager.getAllJimuMapViews();
  if (mapViews.length !== 1) {
    console.warn("No map available to search for layers.");
    return [];
  }
  const jMapView = mapViews[0];

  const jLayerViews = await jMapView.whenAllJimuLayerViewLoaded();
  const jFeatureLayerViews = Object.values(jLayerViews).filter(
    (jlv) => jlv.layer.type === "feature"
  ) as JimuFeatureLayerView[];

  const allNotUpdatingPromise = jFeatureLayerViews.map((jLayerView) => {
    return jLayerView.whenCurrentLayerViewNotUpdating();
  });
  await Promise.all(allNotUpdatingPromise);

  return jFeatureLayerViews;
};
