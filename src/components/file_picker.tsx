import React, { Component, createRef } from "react";
import { PrimaryButton, Text, Stack, MessageBar, MessageBarType } from "@fluentui/react";
import { observer } from "mobx-react";

type FilePickerProps = {
  label?: string;
  allowedExtensions: string[]; // e.g. ['.pdf', '.docx']
  onFilesSelected: (files: FileList) => void;
  multiple?: boolean;
};

type FilePickerState = {
  errorMessage: string | null;
};

@observer
export class FilePicker extends Component<FilePickerProps, FilePickerState> {
  static defaultProps = {
    label: "Select files",
    multiple: false,
  };

  state: FilePickerState = {
    errorMessage: null,
  };

  private inputRef = createRef<HTMLInputElement>();

  handleButtonClick = () => {
    this.setState({ errorMessage: null });
    this.inputRef.current?.click();
  };

  handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      // Validate extensions:
      const allowed = this.props.allowedExtensions.map(ext => ext.toLowerCase());

      // Filter out files with disallowed extensions
      const invalidFiles = Array.from(files).filter(file => {
        const fileExt = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
        return !allowed.includes(fileExt);
      });

      if (invalidFiles.length > 0) {
        this.setState({
          errorMessage: `Invalid file type: ${invalidFiles.map(f => f.name).join(", ")}. Allowed extensions: ${allowed.join(", ")}`,
        });
        // Reset input to allow reselect
        if (this.inputRef.current) this.inputRef.current.value = "";
        return;
      }

      this.setState({ errorMessage: null });
      this.props.onFilesSelected(files);
    }
  };

  render() {
    const { label, allowedExtensions, multiple } = this.props;
    const { errorMessage } = this.state;

    return (
      <Stack tokens={{ childrenGap: 8 }}>
        <Text variant="medium">{label}</Text>
        <PrimaryButton onClick={this.handleButtonClick}>Browse</PrimaryButton>
        {errorMessage && (
          <MessageBar messageBarType={MessageBarType.error} isMultiline>
            {errorMessage}
          </MessageBar>
        )}
        <input
          type="file"
          ref={this.inputRef}
          style={{ display: "none" }}
          accept={allowedExtensions.join(",")}
          multiple={multiple}
          onChange={this.handleFileChange}
        />
      </Stack>
    );
  }
}