import React from "react";
import Icon from "./Icon";
import { formatBytes } from "../lib/files";

// File input with drag and drop. Shows the chosen file, or an image preview.
export default function DropZone({ id, file, onFile, accept, title, hint, preview, invalid, "aria-describedby": describedBy }) {
  const [over, setOver] = React.useState(false);
  const inputRef = React.useRef(null);
  return (
    <div
      className={`dropzone ${over ? "dropzone-over" : ""} ${file ? "dropzone-filled" : ""} ${invalid ? "dropzone-invalid" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        if (e.dataTransfer.files[0]) {
          onFile(e.dataTransfer.files[0]);
        }
      }}
    >
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={accept}
        className="sr-only"
        aria-describedby={describedBy}
        onChange={(e) => e.target.files[0] && onFile(e.target.files[0])}
      />
      {preview ? (
        <img className="dropzone-preview" src={preview} alt="" />
      ) : (
        <span className="dropzone-icon">
          <Icon name={file ? "check" : "upload"} size={22} />
        </span>
      )}
      <div className="dropzone-text">
        {file ? (
          <>
            <strong className="dropzone-name">{file.name}</strong>
            <span className="muted small">{formatBytes(file.size)}</span>
          </>
        ) : (
          <>
            <strong>{title}</strong>
            <span className="muted small">{hint}</span>
          </>
        )}
      </div>
      <button type="button" className="btn btn-secondary btn-sm" onClick={() => inputRef.current.click()}>
        {file ? "Replace" : "Choose file"}
      </button>
    </div>
  );
}
