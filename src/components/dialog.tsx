import React from "react";
import {
	DefaultButton,
	Dialog,
	DialogFooter,
	DialogType,
	PrimaryButton,
} from "@fluentui/react";
import { gState } from "../state";
import { observer } from "mobx-react";

@observer
export class MainDialog extends React.Component {
	render() {
		return (
			<Dialog
				hidden={!gState.dialogOpen}
				onDismiss={() => {
					(gState.dialogOnCancel || (() => {}))();
					gState.dialogOpen = false;
				}}
				dialogContentProps={{
					type: DialogType.normal,
					title: gState.dialogTitle,
					subText: gState.dialogMessage,
				}}
				modalProps={{
					isBlocking: true,
				}}
			>
				<DialogFooter>
					{gState.dialogOnConfirm ? (
						<PrimaryButton
							onClick={() => {
								(gState.dialogOnConfirm || (() => {}))();
								gState.dialogOpen = false;
							}}
							text="Proceed"
						/>
					) : undefined}
					{gState.dialogOnCancel ? (
						<DefaultButton
							onClick={() => {
								(gState.dialogOnCancel || (() => {}))();
								gState.dialogOpen = false;
							}}
							text="Cancel"
						/>
					) : undefined}
				</DialogFooter>
			</Dialog>
		);
	}
}