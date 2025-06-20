import React from "react";
import { FilePicker } from "./file_picker";
import { gState } from "../state";
import logo from "../svgs/logo.svg";
import { observer } from "mobx-react";
import { MessageBar, MessageBarType } from "@fluentui/react";

@observer
export class Loader extends React.Component {
	render(): React.ReactNode {
		return (
			<div id="file-picker">
				<br />
				<h1>CastCad</h1>
				<svg id="logo">
					<use href={`${logo}`} />
				</svg>
				<FilePicker
					label="To start the application select a file"
					allowedExtensions={[".stl"]}
					onFilesSelected={(files) => {
						gState.decodeFile(files[0]);
					}}
					multiple={false}
				></FilePicker>
				<br />
				{gState.decodingError && (
					<MessageBar messageBarType={MessageBarType.error} isMultiline>
						{JSON.stringify(gState.decodingError)}
					</MessageBar>
				)}
				<p style={{ textAlign: "center", fontStyle: "italic", fontSize: 12 }}>
					only STL files are accepted
				</p>
			</div>
		);
	}
}
