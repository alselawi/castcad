import { action, makeAutoObservable } from "mobx";
import { decodeSTL, type DecodedSTL } from "./services/stl_to_mesh";
import type { STLViewer } from "./components/stl_viewer";

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
	selecting = false;
	@action
	startSelecting() {
		this.selecting = true;
	}
	@action
	stopSelecting() {
		this.selecting = false;
	}

	@action
	async decodeFile(file: File) {
		try {
			this.decodingError = null;
			this.decodedSTL = await decodeSTL(file);
		} catch (err) {
			this.decodingError = err as string;
		}
	}

	@action
	setTransformControlsToRotate(viewer: STLViewer) {
		if (!viewer.transformControls) {
			return;
		}
		viewer.transformControls.setMode("rotate");
	}

	@action
	setTransformControlsToTranslate(viewer: STLViewer) {
		if (!viewer.transformControls) {
			return;
		}
		viewer.transformControls.setMode("translate");
	}

	@action
	showTransformControls(viewer: STLViewer) {
		if (
			!viewer.scene ||
			!viewer.transformControlsGizmo ||
			!viewer.transformControls
		) {
			return;
		}
		viewer.scene.add(viewer.transformControlsGizmo);
	}

	@action
	hideTransformControls(viewer: STLViewer) {
		if (
			!viewer.scene ||
			!viewer.transformControlsGizmo ||
			!viewer.transformControls
		) {
			return;
		}
		viewer.scene.remove(viewer.transformControlsGizmo);
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
