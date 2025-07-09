import { Button, Viewer, Worker } from "@react-pdf-viewer/core";
import { defaultLayoutPlugin } from "@react-pdf-viewer/default-layout";
import {
  highlightPlugin,
  type RenderHighlightTargetProps,
} from "@react-pdf-viewer/highlight";
import { useAtom } from "@xstate/store/react";
import browser from "webextension-polyfill";
import { fileAtom } from "../../atoms/fileAtom";
import { pageAtom } from "../../atoms/pageAtom";

const DocumentViewer = () => {
  const file = useAtom(fileAtom);

  const defaultLayoutPluginInstance = defaultLayoutPlugin();
  const renderHighlightTarget = (props: RenderHighlightTargetProps) => (
    <div
      style={{
        background: "#fff",
        border: "1px solid #ccc",
        borderRadius: "4px",
        display: "flex",
        position: "absolute",
        left: `${props.selectionRegion.left}%`,
        top: `${props.selectionRegion.top + props.selectionRegion.height}%`,
        transform: "translate(0, 8px)",
        zIndex: 1000,
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
      }}
    >
      <Button
        onClick={() => {
          navigator.clipboard.writeText(props.selectedText);
          alert("Text copied to clipboard!");
          props.cancel();
        }}
      >
        📄 Copy
      </Button>
    </div>
  );

  const highlightPluginInstance = highlightPlugin({
    renderHighlightTarget: renderHighlightTarget,
  });

  if (!file) return null;
  return (
    <div style={{ height: "100vh", position: "relative" }}>
      <Worker
        workerUrl={browser.runtime.getURL(
          "node_modules/pdfjs-dist/build/pdf.worker.min.js"
        )}
      >
        <Viewer
          fileUrl={file.url}
          plugins={[highlightPluginInstance, defaultLayoutPluginInstance]}
          onPageChange={(event) => {
            pageAtom.set(event.currentPage);
          }}
        />
      </Worker>
    </div>
  );
};

export default DocumentViewer;
