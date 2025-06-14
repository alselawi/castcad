import React from "react";
import logo from "../svgs/logo.svg";
import { DefaultButton, PrimaryButton } from "@fluentui/react";
import { gState } from "../state";
import { STLViewer } from "./stl_viewer";
import { observer } from "mobx-react";
import { ToolButton } from "./tool_button";

import cutSVG from "../svgs/cut.svg";
import alignSVG from "../svgs/align.svg";
import solidifySVG from "../svgs/solidify.svg";

@observer
export class Editor extends React.Component {
	render(): React.ReactNode {
		return (
			<div id="editor">
				<div className="editor-top">
					<div className="logo">
						<svg id="logo" width={50} height={50}>
							<use href={`${logo}`} />
						</svg>
						<h1>CastCad</h1>
					</div>
					<div className="buttons">
						<PrimaryButton iconProps={{ iconName: "export" }}>
							Export
						</PrimaryButton>
						<DefaultButton
							onClick={() => {
								gState.showDialog({
									title: "Closing file",
									message:
										"Are you sure you want to close the this file? All unsaved changes will be lost.",
									type: "warning",
									onConfirm: () => {
										gState.decodedSTL = null;
									},
									onCancel: () => {},
								});
							}}
							iconProps={{ iconName: "cancel" }}
						>
							Close
						</DefaultButton>
					</div>
				</div>

				<div className="tools">
					<ToolButton
						label="Align"
						tooltip="Align the model based on teeth"
						icon={alignSVG}
					></ToolButton>

					<ToolButton
						label="Cut"
						tooltip="Cut away needless areas"
						icon={cutSVG}
					></ToolButton>

					<ToolButton
						label="Solidify"
						tooltip="Solidify and hollow the model to a specific thickness"
						icon={solidifySVG}
					></ToolButton>
				</div>

				{gState.decodedSTL ? (
					<STLViewer decodedSTL={gState.decodedSTL}></STLViewer>
				) : null}
			</div>
		);
	}
}
