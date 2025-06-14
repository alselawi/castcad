import { action, makeAutoObservable } from "mobx";
import { decodeSTL, type DecodedSTL } from "./services/stl_to_mesh";

class AppState {
	constructor() {
		makeAutoObservable(this);
	}


	
	/**
	 * Loading mesh
	 * ============================
	 */

	decodedSTL: DecodedSTL | null = null;
	decodingError: string | null = null;

	@action
	async decodeFile(file: File) {
		try {
			this.decodingError = null;
			this.decodedSTL = await decodeSTL(file);
		} catch (err) {
			this.decodingError = err as string;
		}
	}



	/**
	 * Dialog management
	 * ============================
	 */

	dialogTitle: string = "";
	dialogMessage: string = "";
	dialogOpen: boolean = false;
	dialogType: "error" | "info" | "success" | "warning" = "info";
	dialogOnConfirm: (() => void) | null = null;
	dialogOnCancel: (() => void) | null = null;
	@action
	showDialog({
		title,
		message,
		type,
		onConfirm = null,
		onCancel = null,
	}: {
		title: string;
		message: string;
		type: "error" | "info" | "success" | "warning";
		onConfirm: (() => void) | null;
		onCancel: (() => void) | null;
	}) {
		console.log("show dialog");
		gState.dialogTitle = title;
		gState.dialogMessage = message;
		gState.dialogType = type;
		gState.dialogOnConfirm = onConfirm;
		gState.dialogOnCancel = onCancel;
		gState.dialogOpen = true;
		console.log("show dialog", gState.dialogOpen);
	}
}

export const gState = new AppState();
