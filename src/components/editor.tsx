import React, { createRef } from "react";
import logo from "../svgs/logo.svg";
import { DefaultButton, Icon, PrimaryButton } from "@fluentui/react";
import { gState } from "../state";
import { STLViewer } from "./stl_viewer";
import { observer } from "mobx-react";
import { ToolButton } from "./tool_button";

import cutSVG from "../svgs/cut.svg";
import alignSVG from "../svgs/align.svg";
import solidifySVG from "../svgs/solidify.svg";

@observer
export class Editor extends React.Component {
	viewer = createRef<STLViewer>();

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

				{gState.decodedSTL ? (
					<STLViewer
						ref={this.viewer}
						decodedSTL={gState.decodedSTL}
					></STLViewer>
				) : null}

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

				{this.viewer.current && (
					<div className="controls">
						<DefaultButton
							iconProps={{ iconName: "rotate" }}
							text="Rotate"
							primary={
								this.viewer.current.transformControls?.getMode() === "rotate" &&
								this.viewer.current.transformControlsGizmo.parent ===
									this.viewer.current.scene
							}
							onClick={() => {
								if (
									this.viewer.current.transformControls?.getMode() !==
										"rotate" ||
									this.viewer.current.transformControlsGizmo.parent !==
										this.viewer.current.scene
								) {
									gState.setTransformControlsToRotate(this.viewer.current);
									gState.showTransformControls(this.viewer.current);
								} else {
									gState.hideTransformControls(this.viewer.current);
								}
								this.setState({});
							}}
						/>
						<DefaultButton
							iconProps={{ iconName: "SIPMove" }}
							text="Translate"
							primary={
								this.viewer.current.transformControls?.getMode() ===
									"translate" &&
								this.viewer.current.transformControlsGizmo.parent ===
									this.viewer.current.scene
							}
							onClick={() => {
								if (
									this.viewer.current.transformControls?.getMode() !==
										"translate" ||
									this.viewer.current.transformControlsGizmo.parent !==
										this.viewer.current.scene
								) {
									gState.setTransformControlsToTranslate(this.viewer.current);
									gState.showTransformControls(this.viewer.current);
								} else {
									gState.hideTransformControls(this.viewer.current);
								}
								this.setState({});
							}}
						/>
						<DefaultButton
							iconProps={{ iconName: "video" }}
							text="Reset Camera"
							onClick={() => {
								this.viewer.current.fitCameraToObject();
							}}
						/>
					</div>
				)}

				<div className="camera-table">
					<table>
						<tbody>
							<tr>
								<td></td>
								<td>
									<DefaultButton
										iconProps={{ iconName: "CaretSolidUp" }}
										onClick={() => {
											this.viewer.current.camera.position.set(0, 250, 0);
										}}
									/>
								</td>
								<td></td>
							</tr>
							<tr>
								<td>
									<DefaultButton
										iconProps={{ iconName: "CaretSolidLeft" }}
										onClick={() => {
											this.viewer.current.camera.position.set(250, 0, 0);
										}}
									/>
								</td>
								<td className="middle">
									<Icon iconName="video"></Icon>
								</td>
								<td>
									<DefaultButton
										iconProps={{ iconName: "CaretSolidRight" }}
										onClick={() => {
											this.viewer.current.camera.position.set(-250, 0, 0);
										}}
									/>
								</td>
							</tr>
							<tr>
								<td></td>
								<td>
									<DefaultButton
										iconProps={{ iconName: "CaretSolidDown" }}
										onClick={() => {
											this.viewer.current.camera.position.set(0, -250, 0);
										}}
									/>
								</td>
								<td></td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>
		);
	}
}
