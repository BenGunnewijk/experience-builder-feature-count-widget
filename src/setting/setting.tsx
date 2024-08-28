/** @jsx jsx */
import { jsx, Immutable, AllDataSourceTypes, UseDataSource } from "jimu-core";
import { type AllWidgetSettingProps } from "jimu-for-builder";
import { SettingSection } from "jimu-ui/advanced/setting-components";
import { type CountWidgetConfigIM } from "../config";
import defaultI18nMessages from "./translations/default";
import { useCallback } from "react";
import { DataSourceSelector } from "jimu-ui/advanced/data-source-selector";

/**
 * Shows the settings page of the widget.
 */
export default function (props: AllWidgetSettingProps<CountWidgetConfigIM>) {
  const onToggleUseDataEnabled = (useDataSourcesEnabled: boolean) => {
    props.onSettingChange({
      id: props.id,
      useDataSourcesEnabled,
    });
  };

  const onDataSourceChange = (useDataSources: UseDataSource[]) => {
    props.onSettingChange({
      id: props.id,
      useDataSources: useDataSources,
    });
  };

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

  return (
    <div>
      <div className="widget-setting-get-map-coordinates">
        <SettingSection title={fromLocalization("selectDataSource")}>
          <p style={{ whiteSpace: "preserve-breaks" }}>
            {fromLocalization("selectDataSourceDescription")}
          </p>
          <DataSourceSelector
            types={Immutable([AllDataSourceTypes.FeatureLayer])}
            useDataSources={props.useDataSources}
            useDataSourcesEnabled={props.useDataSourcesEnabled}
            onToggleUseDataEnabled={onToggleUseDataEnabled}
            onChange={onDataSourceChange}
            widgetId={props.id}
            // Let user select multiple layers
            isMultiple={true}
            // But not multiple views per layer, too much code.
            isMultipleDataView={false}
          />
        </SettingSection>
      </div>
    </div>
  );
}
