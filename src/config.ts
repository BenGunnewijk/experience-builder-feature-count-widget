import { type ImmutableObject } from "jimu-core";

// I'm no longer passing the selected map ID and layer ID to the widget through the props.
// Instead I use props.useDataSources[]
// Like it is used here:
// https://github.com/Esri/arcgis-experience-builder-sdk-resources/tree/master/widgets/feature-layer-function
export type CountWidgetConfig = {};

/**
 * A jimu-core ImmutableObject with the widget properties.
 *
 * Ironically, the ImmutableObject makes the props editable in the settings component.
 */
export type CountWidgetConfigIM = ImmutableObject<CountWidgetConfig>;
