// Didn't like the collapsible panel by jimu-ui
// Much easier as custom panel
import React, { CSSProperties, PropsWithChildren } from "react";

export const CollapsablePanel = (
  props: PropsWithChildren<{
    isOpen: boolean;
    style?: CSSProperties;
  }>
) => {
  return (
    <div
      className={"hidablePanel" + (props.isOpen ? " visible" : "")}
      style={{ ...(props.style || {}) }}
    >
      {props.children}
    </div>
  );
};
